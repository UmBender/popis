import type { FindKind, Pos, SearchDir, SearchSpec, VimState } from "./state";

/** Movements that take only a count. */
export type SimpleName =
  | "h"
  | "j"
  | "k"
  | "l"
  | "w"
  | "b"
  | "e"
  | "W"
  | "B"
  | "E"
  | "ge"
  | "0"
  | "^"
  | "$"
  | "gg"
  | "G"
  | "{"
  | "}"
  | "%"
  | ";"
  | ","
  | "n"
  | "N"
  | "*"
  | "#";

/** A complete normal-mode movement: what the typed keys add up to. */
export type Command =
  | { readonly name: SimpleName; readonly count: number | null }
  | { readonly name: FindKind; readonly char: string; readonly count: number | null }
  | { readonly name: "/" | "?"; readonly pattern: string; readonly count: number | null };

// The movements are ports of the Vim routines of the same purpose
// (ADR-T13-1), checked against Neovim by src/vim/cases and `npm run vim:oracle`.
// Columns are string indices; the corpus is ASCII, without tabs.

type Mut = { line: number; col: number };

const isKeyword = (ch: string): boolean => /^[\wÀ-ÿ]$/.test(ch);

/** Vim's cls(): 0 blank (or end of line), 1 punctuation, 2 keyword. */
function charClass(ch: string, big: boolean): 0 | 1 | 2 {
  if (ch === "" || ch === " " || ch === "\t") return 0;
  if (big) return 1;
  return isKeyword(ch) ? 2 : 1;
}

/** A cursor that the word routines move in place. */
type Walker = { readonly lines: readonly string[]; readonly pos: Mut; readonly big: boolean };

const textOf = (w: Walker): string => w.lines[w.pos.line] as string;
const classOf = (w: Walker): 0 | 1 | 2 => charClass(textOf(w).charAt(w.pos.col), w.big);
const onEmptyLine = (w: Walker): boolean => w.pos.col === 0 && textOf(w) === "";

/** Vim's inc(): 0 inside a line, 2 onto the end of a line, 1 onto the next line, -1 at the end. */
function inc(w: Walker): number {
  const length = textOf(w).length;
  if (w.pos.col < length) {
    w.pos.col++;
    return w.pos.col < length ? 0 : 2;
  }
  if (w.pos.line < w.lines.length - 1) {
    w.pos.line++;
    w.pos.col = 0;
    return 1;
  }
  return -1;
}

/** Vim's dec(): 0 inside a line, 1 onto the end of the previous line, -1 at the start. */
function dec(w: Walker): number {
  if (w.pos.col > 0) {
    w.pos.col--;
    return 0;
  }
  if (w.pos.line > 0) {
    w.pos.line--;
    w.pos.col = textOf(w).length;
    return 1;
  }
  return -1;
}

/** Moves while the class stays `klass`; true when it hit an end of the buffer. */
function skipChars(w: Walker, klass: number, forward: boolean): boolean {
  while (classOf(w) === klass) {
    if ((forward ? inc(w) : dec(w)) === -1) return true;
  }
  return false;
}

function fwdWord(w: Walker, count: number): void {
  for (let left = count; left > 0; left--) {
    const sclass = classOf(w);
    const lastLine = w.pos.line === w.lines.length - 1;
    const i = inc(w);
    if (i === -1 || (i >= 1 && lastLine)) return;
    if (sclass !== 0 && skipChars(w, sclass, true)) return;
    while (classOf(w) === 0) {
      if (onEmptyLine(w)) break;
      if (inc(w) === -1) return;
    }
  }
}

function bckWord(w: Walker, count: number): void {
  for (let left = count; left > 0; left--) {
    if (dec(w) === -1) return;
    let stoppedOnEmpty = false;
    while (classOf(w) === 0) {
      if (onEmptyLine(w)) {
        stoppedOnEmpty = true;
        break;
      }
      if (dec(w) === -1) return;
    }
    if (stoppedOnEmpty) continue;
    if (skipChars(w, classOf(w), false)) return;
    inc(w);
  }
}

function endWord(w: Walker, count: number): void {
  for (let left = count; left > 0; left--) {
    const sclass = classOf(w);
    if (inc(w) === -1) return;
    if (classOf(w) === sclass && sclass !== 0) {
      if (skipChars(w, sclass, true)) return;
    } else {
      while (classOf(w) === 0) {
        if (inc(w) === -1) return;
      }
      if (skipChars(w, classOf(w), true)) return;
    }
    dec(w);
  }
}

function bckendWord(w: Walker, count: number): void {
  for (let left = count; left > 0; left--) {
    const sclass = classOf(w);
    if (dec(w) === -1) return;
    if (sclass !== 0 && skipChars(w, sclass, false)) return;
    while (classOf(w) === 0) {
      if (onEmptyLine(w)) break;
      if (dec(w) === -1) return;
    }
  }
}

const WORD_MOTIONS = {
  w: [fwdWord, false],
  W: [fwdWord, true],
  b: [bckWord, false],
  B: [bckWord, true],
  e: [endWord, false],
  E: [endWord, true],
  ge: [bckendWord, false],
} as const;

const colAt = (state: VimState, line: number, col: number, curswant = col): VimState => ({
  ...state,
  cursor: { line, col },
  curswant,
});

/** The column `curswant` gives on a line (Vim's coladvance). */
function advanceCol(state: VimState, line: number): number {
  const length = (state.lines[line] as string).length;
  return Math.min(state.curswant, Math.max(0, length - 1));
}

/** A new line, keeping the wanted column. */
const toLine = (state: VimState, line: number): VimState => ({
  ...state,
  cursor: { line, col: advanceCol(state, line) },
});

function wordMotion(state: VimState, name: keyof typeof WORD_MOTIONS, count: number): VimState {
  const [run, big] = WORD_MOTIONS[name];
  const pos = { ...state.cursor };
  run({ lines: state.lines, pos, big }, count);
  // Never rest on the end-of-line position (Vim's adjust_cursor()).
  const length = (state.lines[pos.line] as string).length;
  if (pos.col > 0 && pos.col >= length) pos.col = length - 1;
  return colAt(state, pos.line, pos.col);
}

function findChar(
  state: VimState,
  kind: FindKind,
  char: string,
  count: number,
  stopAtNext: boolean,
): VimState {
  const dir = kind === "f" || kind === "t" ? 1 : -1;
  const text = state.lines[state.cursor.line] as string;
  let col = state.cursor.col;
  let stop = stopAtNext;
  for (let left = count; left > 0; left--) {
    for (;;) {
      if (dir > 0) {
        col++;
        if (col >= text.length) return state;
      } else {
        if (col === 0) return state;
        col--;
      }
      if (text.charAt(col) === char && stop) break;
      stop = true;
    }
  }
  if (kind === "t" || kind === "T") col -= dir;
  return colAt(state, state.cursor.line, col);
}

const REVERSED: Readonly<Record<FindKind, FindKind>> = { f: "F", F: "f", t: "T", T: "t" };

function repeatFind(state: VimState, reverse: boolean, count: number): VimState {
  const last = state.lastFind;
  if (last === null) return state;
  const kind = reverse ? REVERSED[last.kind] : last.kind;
  // Repeating t or T must move, even when the cursor is next to the character.
  const stop = !(count === 1 && (kind === "t" || kind === "T"));
  return findChar(state, kind, last.char, count, stop);
}

/** An empty line, or one that starts with a form feed, ends a paragraph. */
const endsParagraph = (text: string): boolean => text === "" || text.startsWith("\f");

function paragraph(state: VimState, dir: 1 | -1, count: number): VimState {
  const { lines } = state;
  const last = lines.length - 1;
  let curr = state.cursor.line;
  for (let left = count; left > 0; ) {
    left--;
    let didSkip = false;
    for (let first = true; ; first = false) {
      const text = lines[curr] as string;
      if (text !== "") didSkip = true;
      if (!first && didSkip && endsParagraph(text)) break;
      curr += dir;
      if (curr < 0 || curr > last) {
        if (left > 0) return state;
        curr -= dir;
        break;
      }
    }
  }
  const length = (lines[curr] as string).length;
  const col = curr === last && dir === 1 && length !== 0 ? length - 1 : 0;
  return colAt(state, curr, col);
}

const OPENERS = "([{";
const CLOSERS = ")]}";

/** Vim's findmatchlimit() for `%`, without the `#if` and C comment pairs. */
function matchBracket(lines: readonly string[], from: Pos): Pos | null {
  const first = lines[from.line] as string;
  let col = from.col;
  while (col < first.length && !OPENERS.includes(first.charAt(col)) && !CLOSERS.includes(first.charAt(col))) {
    col++;
  }
  if (col >= first.length) return null;
  const initc = first.charAt(col);
  const backwards = CLOSERS.includes(initc);
  const findc = backwards
    ? OPENERS.charAt(CLOSERS.indexOf(initc))
    : CLOSERS.charAt(OPENERS.indexOf(initc));
  const backslashes = (text: string, at: number): number => {
    let n = 0;
    while (at - 1 - n >= 0 && text.charAt(at - 1 - n) === "\\") n++;
    return n;
  };
  const matchEscaped = backslashes(first, col) & 1;

  let line = from.line;
  let text = first;
  let at = col;
  let count = 0;
  let doQuotes = -1;
  let startInQuotes: boolean | null = null;
  let inquote = false;
  for (;;) {
    if (backwards) {
      if (at === 0) {
        if (line === 0) return null;
        line--;
        text = lines[line] as string;
        at = text.length;
        doQuotes = -1;
      } else {
        at--;
      }
    } else if (at >= text.length) {
      if (line === lines.length - 1) return null;
      line++;
      text = lines[line] as string;
      at = 0;
      doQuotes = -1;
    } else {
      at++;
    }

    // Brackets inside quotes are ignored, but only when the quotes are even.
    if (doQuotes === -1) {
      let atStart = doQuotes;
      let ptr = 0;
      for (; ptr < text.length; ptr++) {
        if (ptr === at + (backwards ? 1 : 0)) atStart = doQuotes & 1;
        const quote = text.charAt(ptr) === '"';
        if (quote && (ptr === 0 || text.charAt(ptr - 1) !== "'" || text.charAt(ptr + 1) !== "'")) {
          doQuotes++;
        }
        if (text.charAt(ptr) === "\\" && ptr + 1 < text.length) ptr++;
      }
      doQuotes &= 1;
      if (doQuotes === 0) {
        inquote = false;
        if (text.charAt(text.length - 1) === "\\") {
          doQuotes = 1;
          if (startInQuotes === null) {
            inquote = true;
            startInQuotes = true;
          } else if (backwards) {
            inquote = true;
          }
        }
        const previous = line > 0 ? (lines[line - 1] as string) : "";
        if (previous.endsWith("\\")) {
          doQuotes = 1;
          if (startInQuotes === null) {
            inquote = atStart !== 0;
            if (inquote) startInQuotes = true;
          } else if (!backwards) {
            inquote = true;
          }
        }
      }
    }
    if (startInQuotes === null) startInQuotes = false;

    const c = text.charAt(at);
    if (c === "") {
      if (at === 0 || text.charAt(at - 1) !== "\\") {
        inquote = false;
        startInQuotes = false;
      }
      continue;
    }
    if (c === '"') {
      if (doQuotes === 1 && (backslashes(text, at) & 1) === 0) {
        inquote = !inquote;
        startInQuotes = false;
      }
      continue;
    }
    if (c === "'") {
      if (backwards) {
        if (at > 1) {
          if (text.charAt(at - 2) === "'") {
            at -= 2;
            continue;
          }
          if (text.charAt(at - 2) === "\\" && at > 2 && text.charAt(at - 3) === "'") {
            at -= 3;
            continue;
          }
        }
      } else if (at + 1 < text.length) {
        if (
          text.charAt(at + 1) === "\\" &&
          at + 2 < text.length &&
          text.charAt(at + 3) === "'"
        ) {
          at += 3;
          continue;
        }
        if (text.charAt(at + 2) === "'") {
          at += 2;
          continue;
        }
      }
    }
    if ((!inquote || startInQuotes) && (c === initc || c === findc)) {
      if ((backslashes(text, at) & 1) === matchEscaped) {
        if (c === initc) {
          count++;
        } else {
          if (count === 0) return { line, col: at };
          count--;
        }
      }
    }
  }
}

const matchCache = new WeakMap<readonly string[], Map<string, readonly Pos[]>>();

/** Every position where the literal `spec` matches, in buffer order. */
export function searchMatches(lines: readonly string[], spec: SearchSpec): readonly Pos[] {
  let cache = matchCache.get(lines);
  if (cache === undefined) {
    cache = new Map();
    matchCache.set(lines, cache);
  }
  const key = `${spec.startWord ? "<" : ""}${spec.pattern}${spec.endWord ? ">" : ""}`;
  const cached = cache.get(key);
  if (cached !== undefined) return cached;
  const found: Pos[] = [];
  const { pattern } = spec;
  if (pattern !== "") {
    // Like Vim with 'cpoptions' c: after a match the next one is looked for
    // at its end, so matches in a line never overlap.
    lines.forEach((text, line) => {
      let col = text.indexOf(pattern);
      while (col >= 0) {
        const boundary =
          !(spec.startWord && isKeyword(text.charAt(col - 1))) &&
          !(spec.endWord && isKeyword(text.charAt(col + pattern.length)));
        if (boundary) found.push({ line, col });
        col = text.indexOf(pattern, col + (boundary ? pattern.length : 1));
      }
    });
  }
  cache.set(key, found);
  return found;
}

const before = (a: Pos, b: Pos): boolean => a.line < b.line || (a.line === b.line && a.col < b.col);

/** Moves to the `count`-th match from `from`, wrapping around the buffer. */
function searchFrom(
  state: VimState,
  spec: SearchSpec,
  dir: SearchDir,
  count: number,
  from: Pos,
): VimState {
  const matches = searchMatches(state.lines, spec);
  const total = matches.length;
  if (total === 0) return state;
  let index: number;
  if (dir === 1) {
    const next = matches.findIndex((m) => before(from, m));
    index = ((next < 0 ? 0 : next) + count - 1) % total;
  } else {
    const prev = matches.findLastIndex((m) => before(m, from));
    index = (((prev < 0 ? total - 1 : prev) - (count - 1)) % total + total) % total;
  }
  const hit = matches[index] as Pos;
  return colAt(state, hit.line, hit.col);
}

/** The word, or run of punctuation, Vim's `*` takes from the cursor's line. */
function identAt(text: string, startCol: number): { spec: SearchSpec; col: number } | null {
  const classAt = (i: number) => charClass(text.charAt(i), false);
  let col = startCol;
  let klass = 0;
  for (let pass = 0; pass < 2; pass++) {
    col = startCol;
    while (col < text.length && (classAt(col) === 0 || (pass === 0 && classAt(col) === 1))) col++;
    klass = classAt(col);
    while (col > 0 && klass !== 0 && classAt(col - 1) === klass) col--;
    if (klass === 2) break;
  }
  if (col >= text.length) return null;
  let end = col;
  while (end < text.length && classAt(end) === klass) end++;
  const pattern = text.slice(col, end);
  const spec = {
    pattern,
    startWord: isKeyword(pattern.charAt(0)),
    endWord: isKeyword(pattern.charAt(pattern.length - 1)),
  };
  return { spec, col };
}

function searchWord(state: VimState, dir: SearchDir, count: number): VimState {
  const text = state.lines[state.cursor.line] as string;
  const word = identAt(text, state.cursor.col);
  if (word === null) return state;
  // Starting at the word's first column makes the search skip the word itself.
  const next = { ...state, lastSearch: { spec: word.spec, dir } };
  return searchFrom(next, word.spec, dir, count, { line: state.cursor.line, col: word.col });
}

function searchPattern(
  state: VimState,
  spec: SearchSpec,
  dir: SearchDir,
  count: number,
): VimState {
  const next = { ...state, lastSearch: { spec, dir } };
  return searchFrom(next, spec, dir, count, state.cursor);
}

/** Runs a movement like Neovim does; a failing movement leaves the cursor. */
export function execute(state: VimState, command: Command): VimState {
  const n = command.count ?? 1;
  const { cursor, lines } = state;
  const last = lines.length - 1;
  const text = lines[cursor.line] as string;
  switch (command.name) {
    case "h":
      return cursor.col === 0 ? state : colAt(state, cursor.line, Math.max(0, cursor.col - n));
    case "l": {
      const max = Math.max(0, text.length - 1);
      return cursor.col >= max ? state : colAt(state, cursor.line, Math.min(max, cursor.col + n));
    }
    case "j":
      return cursor.line >= last ? state : toLine(state, Math.min(last, cursor.line + n));
    case "k":
      return cursor.line <= 0 ? state : toLine(state, Math.max(0, cursor.line - n));
    case "w":
    case "W":
    case "b":
    case "B":
    case "e":
    case "E":
    case "ge":
      return wordMotion(state, command.name, n);
    case "0":
      return colAt(state, cursor.line, 0);
    case "^": {
      const indent = text.search(/\S/);
      return colAt(state, cursor.line, indent >= 0 ? indent : Math.max(0, text.length - 1));
    }
    case "$": {
      if (n > 1 && cursor.line >= last) return state;
      const line = Math.min(last, cursor.line + n - 1);
      const end = Math.max(0, (lines[line] as string).length - 1);
      return colAt(state, line, end, Infinity);
    }
    case "gg":
      return toLine(state, Math.min(last, (command.count ?? 1) - 1));
    case "G":
      return toLine(state, command.count === null ? last : Math.min(last, command.count - 1));
    case "%": {
      if (command.count !== null) {
        if (command.count > 100) return state;
        const line = Math.floor((lines.length * command.count + 99) / 100);
        return toLine(state, Math.min(last, Math.max(0, line - 1)));
      }
      const hit = matchBracket(lines, cursor);
      return hit === null ? state : colAt(state, hit.line, hit.col);
    }
    case "{":
      return paragraph(state, -1, n);
    case "}":
      return paragraph(state, 1, n);
    case "f":
    case "F":
    case "t":
    case "T":
      return findChar(
        { ...state, lastFind: { kind: command.name, char: command.char } },
        command.name,
        command.char,
        n,
        true,
      );
    case ";":
      return repeatFind(state, false, n);
    case ",":
      return repeatFind(state, true, n);
    case "/":
    case "?": {
      const dir = command.name === "/" ? 1 : -1;
      if (command.pattern !== "") {
        return searchPattern(
          state,
          { pattern: command.pattern, startWord: false, endWord: false },
          dir,
          n,
        );
      }
      return state.lastSearch === null
        ? state
        : searchPattern(state, state.lastSearch.spec, dir, n);
    }
    case "n":
    case "N": {
      const memo = state.lastSearch;
      if (memo === null) return state;
      const dir = command.name === "n" ? memo.dir : (-memo.dir as SearchDir);
      return searchFrom(state, memo.spec, dir, n, cursor);
    }
    case "*":
      return searchWord(state, 1, n);
    case "#":
      return searchWord(state, -1, n);
  }
}
