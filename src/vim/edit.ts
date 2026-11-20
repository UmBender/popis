import type { Key } from "./keys";
import { endWord, fwdWord, runMotion, wordWalk, type Command, type SimpleName } from "./motions";
import type {
  Change,
  FindKind,
  Pos,
  Register,
  Session,
  Snapshot,
  UndoStep,
  VimState,
} from "./state";
import { TEXT_OBJECTS, textObjectAt } from "./textobjects";

/** The text `getreg('"')` gives: "a\nb" for characters, "a\n" for lines. */
export function registerText(register: Register): string {
  return register.lines.join("\n") + (register.linewise ? "\n" : "");
}

/** The unnamed register as the Neovim oracle reports it. */
export function registerView(state: VimState): { reg: string; regtype: "" | "v" | "V" } {
  const { register } = state;
  if (register === null) return { reg: "", regtype: "" };
  return { reg: registerText(register), regtype: register.linewise ? "V" : "v" };
}

// ---------------------------------------------------------------- parsing

type Op = "d" | "c" | "y";

/** A movement as typed: its name, the character or pattern it takes, and its keys. */
type Motion = {
  readonly name: string;
  readonly char?: string;
  readonly pattern?: string;
  readonly keys: readonly Key[];
};

type Target =
  | { readonly kind: "line" }
  | { readonly kind: "object"; readonly object: string }
  | { readonly kind: "motion"; readonly motion: Motion };

type Parsed =
  | { readonly kind: "incomplete"; readonly searching: boolean; readonly patternLength: number }
  | { readonly kind: "invalid" }
  | { readonly kind: "motion"; readonly count: number | null; readonly motion: Motion }
  | {
      readonly kind: "operator";
      readonly op: Op;
      readonly count: number | null;
      readonly target: Target;
    }
  | {
      readonly kind: "command";
      readonly name: string;
      readonly count: number | null;
      readonly arg: string;
    };

const SIMPLE_MOTIONS = new Set<string>([..."hjklwbeWBE0^$G{}%;,nN*#"]);
const FIND_KEYS = new Set<string>(["f", "F", "t", "T"]);
const COMMANDS = new Set<string>([..."xXDCsS~pPYuaiAIoO.", "<C-r>"]);

const INVALID: Parsed = { kind: "invalid" };
const WAIT: Parsed = { kind: "incomplete", searching: false, patternLength: 0 };

const isDigit = (key: Key): boolean => key.length === 1 && key >= "0" && key <= "9";
const isChar = (key: Key): boolean => key.length === 1;

/** A count at `from`; a leading 0 is the movement, not a count. */
function readCount(keys: readonly Key[], from: number): { count: number | null; next: number } {
  let count: number | null = null;
  let i = from;
  for (let key = keys[i]; key !== undefined && isDigit(key); key = keys[i]) {
    if (count === null && key === "0") break;
    count = (count ?? 0) * 10 + Number(key);
    i++;
  }
  return { count, next: i };
}

function parseMotion(keys: readonly Key[], i: number): Motion | Parsed {
  // The caller checked that a key is there.
  const key = keys[i] as Key;
  if (SIMPLE_MOTIONS.has(key)) return { name: key, keys: [key] };
  if (FIND_KEYS.has(key)) {
    const char = keys[i + 1];
    if (char === undefined) return WAIT;
    return isChar(char) ? { name: key, char, keys: [key, char] } : INVALID;
  }
  if (key === "g") {
    const next = keys[i + 1];
    if (next === undefined) return WAIT;
    if (next === "g" || next === "e") return { name: `g${next}`, keys: [key, next] };
    return INVALID;
  }
  if (key === "/" || key === "?") {
    let pattern = "";
    for (let j = i + 1; j < keys.length; j++) {
      const k = keys[j] as Key;
      if (k === "<CR>") return { name: key, pattern, keys: keys.slice(i, j + 1) };
      if (!isChar(k)) return INVALID;
      pattern += k;
    }
    return { kind: "incomplete", searching: true, patternLength: pattern.length };
  }
  return INVALID;
}

const isMotion = (value: Motion | Parsed): value is Motion => "name" in value && "keys" in value;

/** What the keys typed so far add up to. */
function parse(keys: readonly Key[]): Parsed {
  const first = readCount(keys, 0);
  const key = keys[first.next];
  if (key === undefined) return WAIT;

  if (key === "d" || key === "c" || key === "y") {
    const second = readCount(keys, first.next + 1);
    const next = keys[second.next];
    if (next === undefined) return WAIT;
    const count =
      first.count === null && second.count === null
        ? null
        : (first.count ?? 1) * (second.count ?? 1);
    const op = key;
    if (next === key) return { kind: "operator", op, count, target: { kind: "line" } };
    if (next === "i" || next === "a") {
      const which = keys[second.next + 1];
      if (which === undefined) return WAIT;
      const object = `${next}${which}`;
      return TEXT_OBJECTS.includes(object)
        ? { kind: "operator", op, count, target: { kind: "object", object } }
        : INVALID;
    }
    const motion = parseMotion(keys, second.next);
    if (!isMotion(motion)) return motion;
    return { kind: "operator", op, count, target: { kind: "motion", motion } };
  }

  if (key === "r") {
    const char = keys[first.next + 1];
    if (char === undefined) return WAIT;
    return isChar(char) || char === "<CR>"
      ? { kind: "command", name: "r", count: first.count, arg: char }
      : INVALID;
  }
  if (COMMANDS.has(key)) return { kind: "command", name: key, count: first.count, arg: "" };

  const motion = parseMotion(keys, first.next);
  if (!isMotion(motion)) return motion;
  return { kind: "motion", count: first.count, motion };
}

function toCommand(motion: Motion, count: number | null): Command {
  if (motion.char !== undefined) {
    return { name: motion.name as FindKind, char: motion.char, count };
  }
  if (motion.pattern !== undefined) {
    return { name: motion.name as "/" | "?", pattern: motion.pattern, count };
  }
  return { name: motion.name as SimpleName, count };
}

// ---------------------------------------------------------------- helpers

type Mut = { line: number; col: number };

const cmp = (a: Pos, b: Pos): number => a.line - b.line || a.col - b.col;

const lineLength = (lines: readonly string[], line: number): number =>
  (lines[line] as string).length;

/** The cursor in normal mode: inside the line, on its last character at most. */
function normalCursor(lines: readonly string[], line: number, col: number): Pos {
  const last = Math.max(0, lineLength(lines, line) - 1);
  return { line, col: Math.max(0, Math.min(col, last)) };
}

function withCursor(state: VimState, line: number, col: number): VimState {
  const cursor = normalCursor(state.lines, line, col);
  return { ...state, cursor, curswant: cursor.col };
}

/** Vim's beginline(BL_WHITE | BL_FIX): the first non-blank, or the last character. */
function firstNonBlank(text: string): number {
  const at = text.search(/\S/);
  return at >= 0 ? at : Math.max(0, text.length - 1);
}

const replaceLine = (lines: readonly string[], at: number, text: string): string[] =>
  lines.map((l, i) => (i === at ? text : l));

const sameLines = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((l, i) => l === b[i]);

/** Pushes an undo step when the buffer changed, and drops the redo steps. */
function withUndo(prev: VimState, before: Snapshot, next: VimState): VimState {
  if (sameLines(before.lines, next.lines)) return next;
  const step: UndoStep = { before, after: { lines: next.lines, cursor: next.cursor } };
  return { ...next, undo: [...prev.undo, step], redo: [] };
}

const snapshot = (state: VimState, cursor: Pos = state.cursor): Snapshot => ({
  lines: state.lines,
  cursor,
});

/** The keys of a count, in Vim notation. */
const countKeys = (count: number | null): Key[] => (count === null ? [] : [...String(count)]);

// ---------------------------------------------------------------- operators

type Range = {
  readonly start: Pos;
  readonly end: Pos;
  readonly inclusive: boolean;
  readonly linewise: boolean;
  /** The range comes from a text object. */
  readonly object?: boolean;
};

/** Only blanks lie before the position (Vim's inindent(0) at the start of a range). */
function inIndentAt(lines: readonly string[], pos: Pos): boolean {
  const text = lines[pos.line] as string;
  let col = 0;
  while (text.charAt(col) === " " || text.charAt(col) === "\t") col++;
  return col >= pos.col;
}

type Found = { readonly range: Range | null; readonly base: VimState };

/** The range of a movement with an operator pending; null when the movement fails. */
function motionRange(state: VimState, op: Op, count: number | null, motion: Motion): Found {
  const n = count ?? 1;
  const { cursor, lines } = state;
  const text = lines[cursor.line] as string;
  const last = lines.length - 1;
  let to: Pos;
  let inclusive = false;
  let linewise = false;
  let base = state;

  const adjustEnd = (pos: Mut): void => {
    // The end of the line is not a character: step back onto the last one.
    const length = lineLength(lines, pos.line);
    if (cmp(cursor, pos) < 0 && pos.col > 0 && pos.col >= length) {
      pos.col = length - 1;
      inclusive = true;
    }
  };

  switch (motion.name) {
    case "h":
      to = { line: cursor.line, col: Math.max(0, cursor.col - n) };
      break;
    case "l": {
      const max = text.length - 1;
      if (text.length === 0) {
        to = cursor;
      } else if (cursor.col + n <= max) {
        to = { line: cursor.line, col: cursor.col + n };
      } else {
        to = { line: cursor.line, col: max };
        inclusive = true;
      }
      break;
    }
    case "w":
    case "W": {
      const pos: Mut = { ...cursor };
      const w = { lines, pos, big: motion.name === "W" };
      const ch = text.charAt(cursor.col);
      if (op === "c" && ch !== "" && ch !== " " && ch !== "\t") {
        // "cw" on a word acts like "ce".
        endWord(w, n, true, false);
        inclusive = true;
      } else {
        fwdWord(w, n, true);
      }
      adjustEnd(pos);
      to = pos;
      break;
    }
    case "e":
    case "E": {
      const pos: Mut = { ...cursor };
      endWord({ lines, pos, big: motion.name === "E" }, n, false, false);
      inclusive = true;
      adjustEnd(pos);
      to = pos;
      break;
    }
    case "b":
    case "B": {
      const pos: Mut = { ...cursor };
      if (!wordWalk.b({ lines, pos, big: motion.name === "B" }, n)) return { range: null, base };
      to = pos;
      break;
    }
    case "ge": {
      const pos: Mut = { ...cursor };
      if (!wordWalk.ge({ lines, pos, big: false }, n)) return { range: null, base };
      inclusive = true;
      to = pos;
      break;
    }
    default: {
      const result = runMotion(state, toCommand(motion, count));
      base = { ...state, lastFind: result.state.lastFind, lastSearch: result.state.lastSearch };
      if (!result.ok) return { range: null, base };
      to = result.state.cursor;
      const name = motion.name;
      linewise = name === "j" || name === "k" || name === "gg" || name === "G";
      if (name === "%" && count !== null) linewise = true;
      inclusive = name === "$" || (name === "%" && count === null) || name === "f" || name === "t";
      if ((name === ";" || name === ",") && state.lastFind !== null) {
        // The kind being repeated, or its opposite for ",": f and t include the target.
        const kind = state.lastFind.kind;
        const wasForward = kind === "f" || kind === "t";
        inclusive = name === ";" ? wasForward : !wasForward;
      }
      // "}" ending on the last line takes that line's last character.
      if (name === "}" && to.line === last && lineLength(lines, last) !== 0) inclusive = true;
    }
  }

  const forward = cmp(to, cursor) >= 0;
  return {
    range: {
      start: forward ? cursor : to,
      end: forward ? to : cursor,
      inclusive,
      linewise,
    },
    base,
  };
}

/** The range an operator works on, or null when the command fails. */
function operatorRange(state: VimState, op: Op, count: number | null, target: Target): Found {
  const { cursor, lines } = state;
  if (target.kind === "line") {
    const n = count ?? 1;
    const last = lines.length - 1;
    if (n > 1 && cursor.line >= last) return { range: null, base: state };
    const end = { line: Math.min(last, cursor.line + n - 1), col: 0 };
    return { range: { start: cursor, end, inclusive: false, linewise: true }, base: state };
  }
  if (target.kind === "object") {
    const found = textObjectAt(lines, cursor, target.object, count ?? 1);
    const hit = found.range;
    if (hit === null)
      return { range: null, base: withCursor(state, found.cursor.line, found.cursor.col) };
    const { start, end, inclusive } = hit;
    return { range: { start, end, inclusive, linewise: false, object: true }, base: state };
  }
  return motionRange(state, op, count, target.motion);
}

/** The text of a range, as the register keeps it. */
function rangeText(lines: readonly string[], range: Range): Register {
  const { start, end } = range;
  if (range.linewise) return { lines: lines.slice(start.line, end.line + 1), linewise: true };
  const endCol = (line: number): number =>
    Math.min(lineLength(lines, line), range.inclusive ? end.col + 1 : end.col);
  if (start.line === end.line) {
    const only = (lines[start.line] as string).slice(start.col, endCol(end.line));
    return { lines: [only], linewise: false };
  }
  const middle = lines.slice(start.line + 1, end.line);
  return {
    lines: [
      (lines[start.line] as string).slice(start.col),
      ...middle,
      (lines[end.line] as string).slice(0, endCol(end.line)),
    ],
    linewise: false,
  };
}

/** The buffer without a character range. */
function deleteChars(lines: readonly string[], range: Range): string[] {
  const { start, end } = range;
  const endCol = Math.min(lineLength(lines, end.line), range.inclusive ? end.col + 1 : end.col);
  const joined =
    (lines[start.line] as string).slice(0, start.col) + (lines[end.line] as string).slice(endCol);
  return [...lines.slice(0, start.line), joined, ...lines.slice(end.line + 1)];
}

/** The buffer without whole lines; an empty buffer keeps one empty line. */
function deleteLines(lines: readonly string[], from: number, to: number): string[] {
  const rest = [...lines.slice(0, from), ...lines.slice(to + 1)];
  return rest.length === 0 ? [""] : rest;
}

/** Runs an operator over a range, the way Vim's do_pending_operator() and op_delete() do. */
function applyOperator(
  state: VimState,
  op: Op,
  count: number | null,
  keys: readonly Key[],
  found: Range,
): VimState {
  const { lines } = state;
  const { start } = found;
  let { end, inclusive, linewise } = found;

  // An exclusive end in column 0 ends on the line before.
  if (!linewise && !inclusive && end.col === 0 && end.line > start.line) {
    const line = end.line - 1;
    if (inIndentAt(lines, start)) {
      linewise = true;
      end = { line, col: 0 };
    } else {
      const length = lineLength(lines, line);
      end = { line, col: Math.max(0, length - 1) };
      inclusive = length > 0;
    }
  }
  // A multi-line delete that leaves only blanks around it works on whole lines.
  if (op === "d" && !linewise && end.line > start.line) {
    const endText = lines[end.line] as string;
    const from = end.col < endText.length && inclusive ? end.col + 1 : end.col;
    if (endText.slice(from).trim() === "" && inIndentAt(lines, start)) linewise = true;
  }
  const range: Range = { start, end, inclusive, linewise };
  const empty = !linewise && !inclusive && cmp(start, end) === 0;
  const change: Change = { count, keys, typed: [] };

  if (op === "y") {
    return withCursor({ ...state, register: rangeText(lines, range) }, start.line, start.col);
  }

  if (op === "d") {
    if (empty) return withCursor(state, start.line, start.col);
    if (linewise) {
      const next = deleteLines(lines, start.line, end.line);
      const line = Math.min(start.line, next.length - 1);
      // With 'nostartofline' the cursor keeps its wanted column; a text object
      // that became whole lines puts it on the first non-blank, as Neovim does.
      const col = found.object === true ? firstNonBlank(next[line] as string) : state.curswant;
      const moved = withCursor(
        { ...state, lines: next, register: rangeText(lines, range) },
        line,
        col,
      );
      return withUndo(state, snapshot(state, start), {
        ...moved,
        curswant: found.object === true ? moved.cursor.col : state.curswant,
        lastChange: change,
      });
    }
    if (start.line === end.line && lines[start.line] === "") return state;
    const moved = withCursor(
      { ...state, lines: deleteChars(lines, range), register: rangeText(lines, range) },
      start.line,
      start.col,
    );
    return withUndo(state, snapshot(state, start), { ...moved, lastChange: change });
  }

  // "c": delete, then insert where the range began.
  const before = snapshot(state, start);
  let next: VimState;
  if (linewise) {
    const kept = [...lines.slice(0, start.line), "", ...lines.slice(end.line + 1)];
    next = {
      ...state,
      lines: kept,
      register: rangeText(lines, range),
      cursor: { line: start.line, col: 0 },
    };
  } else if (empty) {
    next = { ...state, cursor: start };
  } else {
    next = {
      ...state,
      lines: deleteChars(lines, range),
      register: rangeText(lines, range),
      cursor: start,
    };
  }
  return {
    ...next,
    curswant: next.cursor.col,
    mode: "insert",
    pending: [],
    session: { before, count: 1, opened: "here", change: { count, keys }, typed: [] },
  };
}

/** `d`, `c` or `y` with a target. */
function operate(
  state: VimState,
  op: Op,
  count: number | null,
  target: Target,
  keys: readonly Key[],
): VimState {
  const { range, base } = operatorRange(state, op, count, target);
  if (range === null) return base;
  return applyOperator(base, op, count, keys, range);
}

const LINE_TARGET: Target = { kind: "line" };
const motionTarget = (name: string): Target => ({ kind: "motion", motion: { name, keys: [name] } });

// ---------------------------------------------------------------- insert mode

function insertText(state: VimState, text: string): VimState {
  const { line, col } = state.cursor;
  const current = state.lines[line] as string;
  const lines = replaceLine(state.lines, line, current.slice(0, col) + text + current.slice(col));
  return { ...state, lines, cursor: { line, col: col + text.length }, curswant: col + text.length };
}

function insertBreak(state: VimState): VimState {
  const { line, col } = state.cursor;
  const current = state.lines[line] as string;
  const lines = [
    ...state.lines.slice(0, line),
    current.slice(0, col),
    current.slice(col),
    ...state.lines.slice(line + 1),
  ];
  return { ...state, lines, cursor: { line: line + 1, col: 0 }, curswant: 0 };
}

function insertBackspace(state: VimState): VimState {
  const { line, col } = state.cursor;
  const current = state.lines[line] as string;
  if (col > 0) {
    const lines = replaceLine(state.lines, line, current.slice(0, col - 1) + current.slice(col));
    return { ...state, lines, cursor: { line, col: col - 1 }, curswant: col - 1 };
  }
  if (line === 0) return state;
  const previous = state.lines[line - 1] as string;
  const lines = [
    ...state.lines.slice(0, line - 1),
    previous + current,
    ...state.lines.slice(line + 1),
  ];
  const cursor = { line: line - 1, col: previous.length };
  return { ...state, lines, cursor, curswant: previous.length };
}

/** One key of an insert session; null when the key does nothing there. */
function insertKey(state: VimState, key: Key): VimState | null {
  if (key === "<CR>") return insertBreak(state);
  if (key === "<BS>") return insertBackspace(state);
  return isChar(key) ? insertText(state, key) : null;
}

/** Opens an empty line below or above the cursor's line and moves onto it. */
function openLine(state: VimState, below: boolean): VimState {
  const at = state.cursor.line + (below ? 1 : 0);
  const lines = [...state.lines.slice(0, at), "", ...state.lines.slice(at)];
  return { ...state, lines, cursor: { line: at, col: 0 }, curswant: 0 };
}

function startInsert(
  at: VimState,
  before: Snapshot,
  count: number | null,
  keys: readonly Key[],
  opened: "here" | "below" | "above",
): VimState {
  return {
    ...at,
    mode: "insert",
    pending: [],
    session: { before, count: count ?? 1, opened, change: { count, keys }, typed: [] },
  };
}

function pressInsert(state: VimState, key: Key): VimState {
  // Insert mode always has its session.
  const session = state.session as Session;
  if (key !== "<Esc>") {
    const next = insertKey(state, key);
    if (next === null) return state;
    return { ...next, session: { ...session, typed: [...session.typed, key] } };
  }
  // Esc: repeat the text for a count, go back to normal mode, one column left.
  let at = state;
  for (let left = session.count; left > 1; left--) {
    if (session.opened !== "here") at = openLine(at, true);
    // The typed keys were all accepted the first time.
    for (const typed of session.typed) at = insertKey(at, typed) as VimState;
  }
  const { line, col } = at.cursor;
  const cursor = normalCursor(at.lines, line, col > 0 ? col - 1 : 0);
  const change: Change = {
    count: session.change.count,
    keys: session.change.keys,
    typed: [...session.typed, "<Esc>"],
  };
  const done: VimState = {
    ...at,
    mode: "normal",
    session: null,
    cursor,
    curswant: cursor.col,
    lastChange: change,
  };
  return withUndo(state, session.before, done);
}

// ---------------------------------------------------------------- other commands

function toggleCase(ch: string): string {
  const upper = ch.toUpperCase();
  return ch === upper ? ch.toLowerCase() : upper;
}

function put(state: VimState, count: number | null, after: boolean): VimState {
  const { register } = state;
  if (register === null) return state;
  const n = count ?? 1;
  const { line, col } = state.cursor;
  const before = snapshot(state);
  const change: Change = { count, keys: [after ? "p" : "P"], typed: [] };
  const mark = { ...state, lastChange: change };
  if (register.linewise) {
    const block = Array.from({ length: n }, () => register.lines).flat();
    const at = after ? line + 1 : line;
    const lines = [...state.lines.slice(0, at), ...block, ...state.lines.slice(at)];
    const moved = withCursor({ ...mark, lines }, at, firstNonBlank(block[0] as string));
    return withUndo(state, before, moved);
  }
  const current = state.lines[line] as string;
  const insertCol = after && current.length > 0 ? col + 1 : col;
  const parts = register.lines.join("\n").repeat(n).split("\n");
  const prefix = current.slice(0, insertCol);
  const suffix = current.slice(insertCol);
  if (parts.length === 1) {
    const text = parts[0] as string;
    const lines = replaceLine(state.lines, line, prefix + text + suffix);
    const moved = withCursor({ ...mark, lines }, line, insertCol + Math.max(0, text.length - 1));
    return withUndo(state, before, moved);
  }
  const lines = [
    ...state.lines.slice(0, line),
    prefix + (parts[0] as string),
    ...parts.slice(1, -1),
    (parts.at(-1) as string) + suffix,
    ...state.lines.slice(line + 1),
  ];
  return withUndo(state, before, withCursor({ ...mark, lines }, line, insertCol));
}

function replaceChars(state: VimState, count: number | null, char: string): VimState {
  const n = count ?? 1;
  const { line, col } = state.cursor;
  const text = state.lines[line] as string;
  if (col + n > text.length) return state;
  const change: Change = { count, keys: ["r", char], typed: [] };
  const before = snapshot(state);
  if (char === "<CR>") {
    const lines = [
      ...state.lines.slice(0, line),
      text.slice(0, col),
      text.slice(col + n),
      ...state.lines.slice(line + 1),
    ];
    const moved = withCursor({ ...state, lines, lastChange: change }, line + 1, 0);
    return withUndo(state, before, moved);
  }
  const replaced = text.slice(0, col) + char.repeat(n) + text.slice(col + n);
  const lines = replaceLine(state.lines, line, replaced);
  const moved = withCursor({ ...state, lines, lastChange: change }, line, col + n - 1);
  return withUndo(state, before, moved);
}

function toggleChars(state: VimState, count: number | null): VimState {
  const { line, col } = state.cursor;
  const text = state.lines[line] as string;
  if (text === "") return state;
  const end = Math.min(text.length, col + (count ?? 1));
  const toggled = [...text.slice(col, end)].map(toggleCase).join("");
  const lines = replaceLine(state.lines, line, text.slice(0, col) + toggled + text.slice(end));
  const change: Change = { count, keys: ["~"], typed: [] };
  const moved = withCursor({ ...state, lines, lastChange: change }, line, end);
  return withUndo(state, snapshot(state), moved);
}

/** Where undo and redo leave the cursor (Vim's u_undoredo()). */
function afterUndo(state: VimState, target: Snapshot, saved: Pos): VimState {
  const lines = target.lines;
  const base = { ...state, lines };
  // Every command saves the cursor in or next to the lines it changes, so
  // Vim puts the cursor back where it was; a redo can leave that line behind.
  if (saved.line >= lines.length) {
    return { ...base, cursor: { line: lines.length - 1, col: 0 }, curswant: 0 };
  }
  return withCursor(base, saved.line, saved.col);
}

function undo(state: VimState, count: number | null): VimState {
  let s = state;
  for (let left = count ?? 1; left > 0; left--) {
    const step = s.undo.at(-1);
    if (step === undefined) break;
    const moved = afterUndo(s, step.before, step.before.cursor);
    s = { ...moved, undo: s.undo.slice(0, -1), redo: [...s.redo, step] };
  }
  return s;
}

function redo(state: VimState, count: number | null): VimState {
  let s = state;
  for (let left = count ?? 1; left > 0; left--) {
    const step = s.redo.at(-1);
    if (step === undefined) break;
    const moved = afterUndo(s, step.after, step.before.cursor);
    s = { ...moved, redo: s.redo.slice(0, -1), undo: [...s.undo, step] };
  }
  return s;
}

/** `.`: types the last change again; a new count replaces the old one. */
function repeatChange(state: VimState, count: number | null): VimState {
  const change = state.lastChange;
  if (change === null) return state;
  const keys = [...countKeys(count ?? change.count), ...change.keys, ...change.typed];
  let s = state;
  for (const key of keys) s = pressEditKey(s, key);
  return s;
}

function runCommand(state: VimState, name: string, count: number | null, arg: string): VimState {
  const { cursor, lines } = state;
  const text = lines[cursor.line] as string;
  switch (name) {
    case "x":
      return operate(state, "d", count, motionTarget("l"), ["x"]);
    case "X":
      return operate(state, "d", count, motionTarget("h"), ["X"]);
    case "D":
      return operate(state, "d", count, motionTarget("$"), ["D"]);
    case "C":
      return operate(state, "c", count, motionTarget("$"), ["C"]);
    case "s":
      return operate(state, "c", count, motionTarget("l"), ["s"]);
    case "S":
      return operate(state, "c", count, LINE_TARGET, ["S"]);
    case "Y":
      // Neovim 0.12 with --clean: Y is yy, not y$.
      return operate(state, "y", count, LINE_TARGET, ["Y"]);
    case "~":
      return toggleChars(state, count);
    case "r":
      return replaceChars(state, count, arg);
    case "p":
      return put(state, count, true);
    case "P":
      return put(state, count, false);
    case "u":
      return undo(state, count);
    case "<C-r>":
      return redo(state, count);
    case ".":
      return repeatChange(state, count);
    case "i":
      return startInsert(state, snapshot(state), count, ["i"], "here");
    case "a": {
      const col = text.length > 0 ? cursor.col + 1 : cursor.col;
      const at = { ...state, cursor: { line: cursor.line, col } };
      return startInsert(at, snapshot(at), count, ["a"], "here");
    }
    case "I": {
      const indent = text.search(/\S/);
      const col = indent >= 0 ? indent : text.length;
      const at = { ...state, cursor: { line: cursor.line, col } };
      return startInsert(at, snapshot(at), count, ["I"], "here");
    }
    case "A": {
      const at = { ...state, cursor: { line: cursor.line, col: text.length } };
      return startInsert(at, snapshot(at), count, ["A"], "here");
    }
    case "o":
      return startInsert(openLine(state, true), snapshot(state), count, ["o"], "below");
    default:
      return startInsert(openLine(state, false), snapshot(state), count, ["O"], "above");
  }
}

// ---------------------------------------------------------------- entry point

function pressNormal(state: VimState, key: Key): VimState {
  const typed = state.pending;
  if (key === "<BS>") {
    const pending = parse(typed);
    if (pending.kind === "incomplete" && pending.searching) {
      return { ...state, pending: pending.patternLength === 0 ? [] : typed.slice(0, -1) };
    }
  }
  const keys = [...typed, key];
  const parsed = parse(keys);
  const idle: VimState = { ...state, pending: [] };
  switch (parsed.kind) {
    case "incomplete":
      return { ...state, pending: keys };
    case "invalid":
      return idle;
    case "motion":
      return runMotion(idle, toCommand(parsed.motion, parsed.count)).state;
    case "command":
      return runCommand(idle, parsed.name, parsed.count, parsed.arg);
    case "operator": {
      const target = parsed.target;
      const targetKeys =
        target.kind === "line"
          ? [parsed.op]
          : target.kind === "object"
            ? [...target.object]
            : target.motion.keys;
      return operate(idle, parsed.op, parsed.count, target, [parsed.op, ...targetKeys]);
    }
  }
}

/**
 * Types one key with every command allowed: movements, operators, text
 * objects, the insert commands, `u`, `<C-r>` and `.` (ADR-T14-1).
 */
export function pressEditKey(state: VimState, key: Key): VimState {
  return state.mode === "insert" ? pressInsert(state, key) : pressNormal(state, key);
}
