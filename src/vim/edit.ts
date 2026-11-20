import {
  cmp,
  countKeys,
  firstNonBlank,
  joinLines,
  lineLength,
  normalCursor,
  replaceLine,
  shiftLine,
  snapshot,
  withCursor,
  withUndo,
  type Mut,
} from "./buffer";
import { pressCmdline, startCmdline } from "./ex";
import type { Key } from "./keys";
import { endWord, fwdWord, runMotion, wordWalk } from "./motions";
import { incrementAt } from "./increment";
import {
  isChar,
  parse,
  parseVisual,
  toCommand,
  type Motion,
  type Op,
  type Parsed,
  type Target,
} from "./parse";
import {
  getRegister,
  isRegisterName,
  macroKeys,
  recordMacro,
  registerText,
  storeRegister,
  type WriteKind,
} from "./registers";
import type { Change, Pos, Register, Session, Snapshot, UndoStep, VimState } from "./state";
import { textObjectAt } from "./textobjects";
import { enterVisual, finishBlockInsert, pressVisual, reselect } from "./visual";

export { registerText };

/** The unnamed register as the Neovim oracle reports it. */
export function registerView(state: VimState): {
  reg: string;
  regtype: "" | "v" | "V" | `\x16${number}`;
} {
  const { register } = state;
  if (register === null) return { reg: "", regtype: "" };
  const reg = registerText(register);
  if (register.block !== undefined)
    return { reg, regtype: `\x16${String(register.block)}` as `\x16${number}` };
  return { reg, regtype: register.linewise ? "V" : "v" };
}

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

  if (op === ">" || op === "<") {
    const last = lines.length - 1;
    const bottom = Math.min(end.line, last);
    const next = lines.map((text, i) =>
      i >= start.line && i <= bottom ? shiftLine(text, op, 1) : text,
    );
    // The cursor keeps its wanted column on the first line (nostartofline).
    const moved = withCursor(
      { ...state, lines: next, lastChange: change },
      start.line,
      state.curswant,
    );
    return withUndo(state, snapshot(state, start), { ...moved, curswant: state.curswant });
  }

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
  if (range === null) return { ...base, failed: true };
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

/**
 * `<C-r>` and a register name: the text goes in as typed, and `.` repeats the
 * text itself, not the `<C-r>`. A key that names no register is dropped.
 */
function pasteRegister(state: VimState, session: Session, key: Key): VimState {
  const register = isRegisterName(key) ? getRegister(state, key) : null;
  const waiting: Session = { ...session, ctrlR: false };
  if (register === null) return { ...state, session: waiting };
  let at: VimState = state;
  const typed: Key[] = [];
  // Code units, so every typed key is one character.
  for (const ch of registerText(register).split("")) {
    const pressed = ch === "\n" ? "<CR>" : ch;
    at = ch === "\n" ? insertBreak(at) : insertText(at, ch);
    typed.push(pressed);
  }
  return { ...at, session: { ...waiting, typed: [...session.typed, ...typed] } };
}

function pressInsert(state: VimState, key: Key): VimState {
  // Insert mode always has its session.
  const session = state.session as Session;
  if (session.ctrlR === true) return pasteRegister(state, session, key);
  if (key === "<C-r>") return { ...state, session: { ...session, ctrlR: true } };
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
    lastChange: session.noRepeat === true ? state.lastChange : change,
  };
  const finished = session.block === undefined ? done : finishBlockInsert(done, session);
  return withUndo(state, session.before, finished);
}

// ---------------------------------------------------------------- other commands

function toggleCase(ch: string): string {
  const upper = ch.toUpperCase();
  return ch === upper ? ch.toLowerCase() : upper;
}

function put(state: VimState, count: number | null, after: boolean): VimState {
  const { register } = state;
  if (register === null) return { ...state, failed: true };
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
  if (col + n > text.length) return { ...state, failed: true };
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
    if (step === undefined) return { ...s, failed: true };
    const moved = afterUndo(s, step.before, step.before.cursor);
    s = { ...moved, undo: s.undo.slice(0, -1), redo: [...s.redo, step] };
  }
  return s;
}

function redo(state: VimState, count: number | null): VimState {
  let s = state;
  for (let left = count ?? 1; left > 0; left--) {
    const step = s.redo.at(-1);
    if (step === undefined) return { ...s, failed: true };
    const moved = afterUndo(s, step.after, step.before.cursor);
    s = { ...moved, redo: s.redo.slice(0, -1), undo: [...s.undo, step] };
  }
  return s;
}

/** `.`: types the last change again; a new count replaces the old one. */
function repeatChange(state: VimState, count: number | null): VimState {
  const change = state.lastChange;
  if (change === null) return state;
  // A register prefix goes first; a numbered register moves on to the next one.
  const named = change.keys[0] === '"';
  const name = named ? (change.keys[1] as Key) : "";
  const moved = /^[1-8]$/.test(name) ? String(Number(name) + 1) : name;
  const prefix = named ? ['"', moved] : [];
  const rest = named ? change.keys.slice(2) : change.keys;
  const keys = [...prefix, ...countKeys(count ?? change.count), ...rest, ...change.typed];
  let s = state;
  for (const key of keys) s = dispatch(s, key);
  return s;
}

/** `J`: joins `count` lines (at least two); a count past the end joins what is left. */
function joinCommand(state: VimState, count: number | null): VimState {
  const from = state.cursor.line;
  const last = state.lines.length - 1;
  let n = Math.max(2, count ?? 2);
  if (from + n - 1 > last) {
    if (n <= 2) return { ...state, failed: true };
    n = last - from + 1;
  }
  if (n < 2) return { ...state, failed: true };
  const joined = joinLines(state.lines, from, n);
  const change: Change = { count, keys: ["J"], typed: [] };
  const moved = withCursor({ ...state, lines: joined.lines, lastChange: change }, from, joined.col);
  return withUndo(state, snapshot(state), moved);
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
    case "v":
      return enterVisual(state, "char");
    case "V":
      return enterVisual(state, "line");
    case "<C-v>":
      return enterVisual(state, "block");
    case "gv":
      return reselect(state);
    case "q":
      return { ...state, recording: { name: arg, keys: [] } };
    case "@":
      return runMacro(state, count, arg);
    case "<C-a>":
      return incrementAt(state, count, 1);
    case "<C-x>":
      return incrementAt(state, count, -1);
    case ":":
      return startCmdline(state);
    case "J":
      return joinCommand(state, count);
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

/** The movements that send a delete to register 1 even inside a line. */
const REGISTER_ONE_MOTIONS = new Set<string>([..."%()`/?nN{}"]);

type Write = { readonly kind: WriteKind; readonly one: boolean };

/** What a command does to the registers: a copy, a delete, or nothing. */
function writeOf(parsed: Extract<Parsed, { kind: "operator" | "command" }>): Write | null {
  if (parsed.kind === "operator") {
    if (parsed.op === "y") return { kind: "yank", one: false };
    if (parsed.op === ">" || parsed.op === "<") return null;
    const one =
      parsed.target.kind === "motion" && REGISTER_ONE_MOTIONS.has(parsed.target.motion.name);
    return { kind: "delete", one };
  }
  if (parsed.name === "Y") return { kind: "yank", one: false };
  return "xXDCsS".includes(parsed.name) ? { kind: "delete", one: false } : null;
}

/** The same for a command typed in visual mode. */
function visualWriteOf(keys: readonly Key[]): Write | null {
  const parsed = parseVisual(keys);
  if (parsed.kind !== "command") return null;
  if (parsed.name === "y") return { kind: "yank", one: false };
  return ["d", "x", "c", "s"].includes(parsed.name) ? { kind: "delete", one: false } : null;
}

function finishWrite(
  idle: VimState,
  next: VimState,
  write: Write | null,
  use: string | null,
): VimState {
  return write === null ? next : storeRegister(idle, next, write.kind, use, write.one);
}

function pressNormal(state: VimState, key: Key, use: string | null): VimState {
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
    case "motion": {
      const moved = runMotion(idle, toCommand(parsed.motion, parsed.count));
      return { ...moved.state, failed: !moved.ok };
    }
    case "command": {
      if ((parsed.name === "p" || parsed.name === "P") && use !== null) {
        // Paste from the named register; the unnamed one is not touched.
        const source = getRegister(idle, use);
        if (source === null) return { ...idle, failed: true };
        const put = runCommand({ ...idle, register: source }, parsed.name, parsed.count, "");
        return { ...put, register: idle.register };
      }
      const next = runCommand(idle, parsed.name, parsed.count, parsed.arg);
      return finishWrite(idle, next, writeOf(parsed), use);
    }
    case "operator": {
      const target = parsed.target;
      const targetKeys =
        target.kind === "line"
          ? [parsed.op]
          : target.kind === "object"
            ? [...target.object]
            : target.motion.keys;
      const next = operate(idle, parsed.op, parsed.count, target, [parsed.op, ...targetKeys]);
      return finishWrite(idle, next, writeOf(parsed), use);
    }
  }
}

/** The key the macro runner types for a character of the register. */
const macroKey = (state: VimState, key: Key): Key =>
  key === "\n" ? (state.mode === "insert" ? "<CR>" : "j") : key;

/** `@x`, `@@` and a count: types the register again, and stops at the first failure. */
function runMacro(state: VimState, count: number | null, name: string): VimState {
  const letter = name === "@" ? state.lastMacro : name;
  const register = letter === null ? null : getRegister(state, letter);
  if (letter === null || register === null) return { ...state, failed: true };
  const keys = macroKeys(registerText(register));
  let s: VimState = { ...state, lastMacro: letter };
  for (let n = count ?? 1; n > 0 && !s.failed; n--) {
    for (const key of keys) {
      s = dispatch({ ...s, failed: false }, macroKey(s, key));
      if (s.failed) break;
    }
  }
  return oneUndoStep(state, s);
}

/** Vim undoes a whole macro run at once: its undo steps become one. */
function oneUndoStep(start: VimState, end: VimState): VimState {
  const first = start.undo.length;
  const added = end.undo.slice(first);
  const grew =
    end.undo.length > first && end.undo.slice(0, first).every((s, i) => s === start.undo[i]);
  if (!grew || added.length < 2) return end;
  const merged = { before: (added[0] as UndoStep).before, after: (added.at(-1) as UndoStep).after };
  return { ...end, undo: [...end.undo.slice(0, first), merged] };
}

/** `lastChange` and the insert session that a register prefix opened remember it. */
function withPrefix(before: VimState, next: VimState, prefix: readonly Key[]): VimState {
  let result = next;
  if (next.lastChange !== null && next.lastChange !== before.lastChange) {
    result = {
      ...result,
      lastChange: { ...next.lastChange, keys: [...prefix, ...next.lastChange.keys] },
    };
  }
  const session = next.session;
  if (session !== null && session !== before.session) {
    const change = { ...session.change, keys: [...prefix, ...session.change.keys] };
    result = { ...result, session: { ...session, change } };
  }
  return result;
}

/** A key typed in normal or visual mode, with the `"x` register prefix in front of the command. */
function pressCommand(state: VimState, key: Key): VimState {
  const pending = state.pending;
  const visual = state.mode === "visual";
  const quote = pending.indexOf('"');
  const isCount = (keys: readonly Key[]): boolean => keys.every((k) => k >= "0" && k <= "9");
  // The prefix comes first or after a count: `"a3p` and `3"ap`.
  if (quote < 0 || !isCount(pending.slice(0, quote))) {
    if (key === '"' && isCount(pending)) return { ...state, pending: [...pending, '"'] };
    if (!visual) return pressNormal(state, key, null);
    return finishWrite(state, pressVisual(state, key), visualWriteOf([...pending, key]), null);
  }
  if (pending.length === quote + 1) {
    return { ...state, pending: isRegisterName(key) ? [...pending, key] : [] };
  }
  const use = pending[quote + 1] as Key;
  const rest = [...pending.slice(0, quote), ...pending.slice(quote + 2)];
  const idle: VimState = { ...state, pending: rest };
  let next: VimState;
  if (visual) {
    next = finishWrite(idle, pressVisual(idle, key), visualWriteOf([...rest, key]), use);
  } else {
    next = pressNormal(idle, key, use);
  }
  // A command still being typed keeps the prefix in front of its keys.
  if (next.pending.length > 0) return { ...next, pending: ['"', use, ...next.pending] };
  return withPrefix(idle, next, ['"', use]);
}

function dispatch(state: VimState, key: Key): VimState {
  switch (state.mode) {
    case "insert":
      return pressInsert(state, key);
    case "cmdline":
      return pressCmdline(state, key);
    case "normal":
    case "visual":
      return pressCommand(state, key);
  }
}

/**
 * Types one key with every command allowed: movements, operators, text
 * objects, the insert commands, `u`, `<C-r>` and `.` (ADR-T14-1).
 */
export function pressEditKey(state: VimState, key: Key): VimState {
  const recording = state.recording;
  if (recording !== null && key === "q" && state.mode === "normal" && state.pending.length === 0) {
    return recordMacro(state, recording.name, recording.keys);
  }
  const next = dispatch({ ...state, failed: false }, key);
  if (recording === null || next.recording === null) return next;
  // Only the keys typed here are recorded, not those a macro or `.` types.
  return { ...next, recording: { name: recording.name, keys: [...recording.keys, key] } };
}
