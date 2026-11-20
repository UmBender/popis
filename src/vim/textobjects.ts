import { classOf, dec, endWord, fwdWord, inc, scanPair, type Walker } from "./motions";
import type { Pos } from "./state";

/**
 * The range a text object gives, as Vim's operators read it: `end` is the
 * last character when `inclusive`, and the first one left out otherwise.
 */
export type TextRange = {
  readonly start: Pos;
  readonly end: Pos;
  readonly inclusive: boolean;
};

/** The text object keys: "iw", "a(", 'i"'... */
export const TEXT_OBJECTS: readonly string[] = [
  ...["iw", "aw", "iW", "aW", "ib", "ab", "iB", "aB"],
  ...["i(", "a(", "i)", "a)", "i{", "a{", "i}", "a}", "i[", "a[", "i]", "a]"],
  ...["i<", "a<", "i>", "a>"],
  ...['i"', 'a"', "i'", "a'", "i`", "a`"],
];

type Mut = { line: number; col: number };

const walker = (lines: readonly string[], pos: Mut, big = false): Walker => ({ lines, pos, big });
const set = (target: Mut, from: Pos): void => {
  target.line = from.line;
  target.col = from.col;
};
const lineAt = (w: Walker): string => w.lines[w.pos.line] as string;

/** Vim's incl(): like inc(), but steps over the end of a line. */
function incl(w: Walker): number {
  let r = inc(w);
  if (r >= 1 && w.pos.col > 0) r = inc(w);
  return r;
}

/** Vim's decl(): like dec(), but steps over the end of a line. */
function decl(w: Walker): number {
  let r = dec(w);
  if (r === 1 && w.pos.col > 0) r = dec(w);
  return r;
}

function oneleft(w: Walker): boolean {
  if (w.pos.col === 0) return false;
  w.pos.col--;
  return true;
}

/** Vim's back_in_line(): to the start of the run of the same class. */
function backInLine(w: Walker): void {
  const sclass = classOf(w);
  while (w.pos.col > 0) {
    dec(w);
    if (classOf(w) !== sclass) {
      inc(w);
      break;
    }
  }
}

/** Vim's inindent(extra): only blanks lie before the cursor column plus `extra`. */
function inIndent(w: Walker, extra: number): boolean {
  const text = lineAt(w);
  let col = 0;
  while (text.charAt(col) === " " || text.charAt(col) === "\t") col++;
  return col >= w.pos.col + extra;
}

/** Vim's current_word(): `iw`, `aw`, `iW` and `aW`. */
function currentWord(
  lines: readonly string[],
  cursor: Pos,
  count: number,
  include: boolean,
  big: boolean,
): TextRange | null {
  const pos: Mut = { ...cursor };
  const w = walker(lines, pos, big);
  backInLine(w);
  let start: Pos = { ...pos };
  const startPos = start;
  let inclusive = true;
  let includeWhite = false;
  if ((classOf(w) === 0) === include) {
    if (!endWord(w, 1, true, true)) return null;
  } else {
    fwdWord(w, 1, true);
    if (pos.col === 0) decl(w);
    else oneleft(w);
    if (include) includeWhite = true;
  }
  for (let left = count - 1; left > 0; left--) {
    inclusive = true;
    if (incl(w) === -1) return null;
    if (include !== (classOf(w) === 0)) {
      if (!fwdWord(w, 1, true) && left > 1) return null;
      // At the start of a line, the blank before it is the end.
      if (!oneleft(w)) inclusive = false;
    } else if (!endWord(w, 1, true, true)) {
      return null;
    }
  }
  if (includeWhite && (classOf(w) !== 0 || (pos.col === 0 && !inclusive))) {
    // No blank at the end: take the blank before the word instead, but not the indent.
    const end: Pos = { ...pos };
    set(pos, startPos);
    if (oneleft(w)) {
      backInLine(w);
      if (classOf(w) === 0 && pos.col > 0) start = { ...pos };
    }
    set(pos, end);
  }
  return { start, end: { ...pos }, inclusive };
}

const PAIRS: Readonly<Record<string, string>> = { "(": ")", "{": "}", "[": "]", "<": ">" };

/** The opening character of the pair a block object names ("b" is "("). */
function blockOpener(key: string): string | null {
  if (key === "b") return "(";
  if (key === "B") return "{";
  for (const [open, close] of Object.entries(PAIRS)) {
    if (key === open || key === close) return open;
  }
  return null;
}

/** Vim's current_block(): `i(`, `a{`, `ib`, `aB`, `i[`, `a<`... */
function currentBlock(
  lines: readonly string[],
  cursor: Pos,
  count: number,
  include: boolean,
  what: string,
): TextRange | null {
  const other = PAIRS[what] as string;
  const pos: Mut = { ...cursor };
  const w = walker(lines, pos);
  if (what === "{") {
    while (inIndent(w, 1)) if (inc(w) !== 0) break;
  }
  if (lineAt(w).charAt(pos.col) === what) pos.col++;

  // The unclosed `what` before the cursor; failing that, the next one ahead.
  const back = (from: Pos): Pos | null => scanPair(lines, from, other, what, true, 0, false);
  const ahead = (from: Pos): Pos | null => scanPair(lines, from, other, what, false, 0, false);
  const find = back({ ...pos }) !== null ? back : ahead;
  let hit: Pos | null = null;
  let startPos: Pos = { ...pos };
  for (let left = count; left > 0; left--) {
    hit = find({ ...pos });
    if (hit === null) break;
    set(pos, hit);
    startPos = hit;
  }
  if (hit === null) return null;
  const endPos = scanPair(lines, { ...pos }, what, other, false, 0, false);
  if (endPos === null) return null;
  set(pos, endPos);

  let sol = false;
  if (!include) {
    const s: Mut = { ...startPos };
    incl(walker(lines, s));
    startPos = { ...s };
    sol = pos.col === 0;
    decl(w);
    while (inIndent(w, 1)) {
      sol = true;
      if (decl(w) !== 0) break;
    }
  }
  let inclusive = false;
  if (sol) {
    incl(w);
  } else if (startPos.line < pos.line || (startPos.line === pos.line && startPos.col <= pos.col)) {
    inclusive = true;
  } else {
    // Nothing between the pair: an empty range at the start.
    set(pos, startPos);
  }
  return { start: startPos, end: { ...pos }, inclusive };
}

function findNextQuote(line: string, from: number, quote: string, escape: boolean): number {
  let col = from;
  for (;;) {
    const c = line.charAt(col);
    if (c === "") return -1;
    if (escape && c === "\\") {
      col++;
      if (line.charAt(col) === "") return -1;
    } else if (c === quote) {
      return col;
    }
    col++;
  }
}

function findPrevQuote(line: string, from: number, quote: string): number {
  let col = from;
  while (col > 0) {
    col--;
    let n = 0;
    while (col - n > 0 && line.charAt(col - n - 1) === "\\") n++;
    if (n & 1) col -= n;
    else if (line.charAt(col) === quote) break;
  }
  return col;
}

/** Vim's current_quote(): `i"`, `a'`, `` i` `` and the like, on the cursor's line. */
function currentQuote(
  lines: readonly string[],
  cursor: Pos,
  count: number,
  include: boolean,
  quote: string,
): TextRange | null {
  const line = lines[cursor.line] as string;
  let colStart = cursor.col;
  let colEnd: number;
  if (line.charAt(colStart) === quote) {
    // On a quote: is it an opening or a closing one? Pair them from the line start.
    const first = colStart;
    colStart = 0;
    for (;;) {
      colStart = findNextQuote(line, colStart, quote, false);
      if (colStart < 0 || colStart > first) return null;
      colEnd = findNextQuote(line, colStart + 1, quote, true);
      if (colEnd < 0) return null;
      if (colStart <= first && first <= colEnd) break;
      colStart = colEnd + 1;
    }
  } else {
    colStart = findPrevQuote(line, colStart, quote);
    if (line.charAt(colStart) !== quote) {
      // No quote before the cursor: look after it.
      colStart = findNextQuote(line, colStart, quote, false);
      if (colStart < 0) return null;
    }
    colEnd = findNextQuote(line, colStart + 1, quote, true);
    if (colEnd < 0) return null;
  }
  const blank = (col: number): boolean => line.charAt(col) === " " || line.charAt(col) === "\t";
  if (include) {
    if (blank(colEnd + 1)) {
      while (blank(colEnd + 1)) colEnd++;
    } else {
      while (colStart > 0 && blank(colStart - 1)) colStart--;
    }
  }
  if (!include && count < 2) colStart++;
  const start = { line: cursor.line, col: colStart };
  let end = { line: cursor.line, col: colEnd };
  let inclusive = false;
  if (include || count > 1) {
    end = { line: cursor.line, col: colEnd + 1 };
    // Past the last character: the end is that character itself.
    if (end.col >= line.length) inclusive = true;
  }
  return { start, end, inclusive };
}

/**
 * The text object `object` ("iw", "a(", 'i"') around `cursor`, or null when
 * there is none. Ports of Vim's current_word(), current_block() and
 * current_quote().
 */
export function textObject(
  lines: readonly string[],
  cursor: Pos,
  object: string,
  count: number,
): TextRange | null {
  const include = object.startsWith("a");
  const key = object.slice(1);
  switch (key) {
    case "w":
      return currentWord(lines, cursor, count, include, false);
    case "W":
      return currentWord(lines, cursor, count, include, true);
    case '"':
    case "'":
    case "`":
      return currentQuote(lines, cursor, count, include, key);
    default: {
      const opener = blockOpener(key);
      return opener === null ? null : currentBlock(lines, cursor, count, include, opener);
    }
  }
}
