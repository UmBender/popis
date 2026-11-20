import {
  cmp,
  joinLines,
  lineLength,
  normalCursor,
  replaceLine,
  shiftLine,
  snapshot,
  withCursor,
  withUndo,
} from "./buffer";
import type { Key } from "./keys";
import { runMotion } from "./motions";
import { parseVisual, toCommand, type Motion } from "./parse";
import type { BlockInsert, Pos, Register, Session, VimState, VisualKind, VisualSel } from "./state";
import { textObjectAt } from "./textobjects";

// The visual mode (ADR-T15-1): a selection from an anchor to the cursor, the
// operators that act on it, and the block insert.

/** The selection as the commands see it: its ends in order and the block columns. */
type Geometry = {
  readonly kind: VisualKind;
  readonly start: Pos;
  readonly end: Pos;
  readonly left: number;
  readonly right: number;
  /** `$` was used: a block runs to the end of every line. */
  readonly eol: boolean;
};

function geometry(state: VimState): Geometry {
  const { anchor, kind } = state.visual as VisualSel;
  const { cursor } = state;
  const forward = cmp(anchor, cursor) <= 0;
  return {
    kind,
    start: forward ? anchor : cursor,
    end: forward ? cursor : anchor,
    left: Math.min(anchor.col, cursor.col),
    right: Math.max(anchor.col, cursor.col),
    eol: state.curswant === Infinity,
  };
}

/** The columns `[from, to)` of `line` the selection covers, or null. */
export function selectionRange(
  state: VimState,
  line: number,
): { readonly from: number; readonly to: number } | null {
  if (state.mode !== "visual" || state.visual === null) return null;
  const g = geometry(state);
  if (line < g.start.line || line > g.end.line) return null;
  const length = lineLength(state.lines, line);
  if (g.kind === "line") return { from: 0, to: length + 1 };
  if (g.kind === "char") {
    return {
      from: line === g.start.line ? g.start.col : 0,
      to: line === g.end.line ? g.end.col + 1 : length,
    };
  }
  const to = g.eol ? length + 1 : Math.min(g.right + 1, length);
  return to <= g.left ? null : { from: g.left, to };
}

export function enterVisual(state: VimState, kind: VisualKind): VimState {
  return { ...state, mode: "visual", visual: { kind, anchor: state.cursor }, pending: [] };
}

/** `gv`: the last selection again. */
export function reselect(state: VimState): VimState {
  const mark = state.lastVisual;
  if (mark === null) return { ...state, pending: [] };
  const last = state.lines.length - 1;
  const clamp = (pos: Pos): Pos => {
    const line = Math.min(pos.line, last);
    return { line, col: Math.min(pos.col, lineLength(state.lines, line)) };
  };
  const cursor = clamp(mark.cursor);
  return {
    ...state,
    mode: "visual",
    visual: { kind: mark.kind, anchor: clamp(mark.anchor) },
    cursor,
    curswant: cursor.col,
    pending: [],
  };
}

/** Back to normal mode, remembering the selection. */
function leave(state: VimState): VimState {
  const sel = state.visual as VisualSel;
  const cursor = normalCursor(state.lines, state.cursor.line, state.cursor.col);
  return {
    ...state,
    mode: "normal",
    visual: null,
    pending: [],
    cursor,
    lastVisual: { kind: sel.kind, anchor: sel.anchor, cursor: state.cursor },
  };
}

// ---------------------------------------------------------------- movements

/** In visual mode the cursor may sit on the line break (past the last character). */
function visualMotion(state: VimState, motion: Motion, count: number | null): VimState {
  const { cursor } = state;
  const length = lineLength(state.lines, cursor.line);
  if (motion.name === "l") {
    if (cursor.col >= length) return state;
    const col = Math.min(length, cursor.col + (count ?? 1));
    return { ...state, cursor: { line: cursor.line, col }, curswant: col };
  }
  const next = runMotion(state, toCommand(motion, count)).state;
  if (motion.name !== "j" && motion.name !== "k" && motion.name !== "$") return next;
  const at = next.cursor.line;
  const room = lineLength(next.lines, at);
  return { ...next, cursor: { line: at, col: Math.min(next.curswant, room) } };
}

function selectObject(state: VimState, object: string, count: number | null): VimState {
  const found = textObjectAt(state.lines, state.cursor, object, count ?? 1);
  const hit = found.range;
  if (hit === null) return state;
  let end = hit.end;
  if (!hit.inclusive) {
    end =
      end.col > 0
        ? { line: end.line, col: end.col - 1 }
        : { line: end.line - 1, col: lineLength(state.lines, end.line - 1) };
  }
  const sel = state.visual as VisualSel;
  return { ...state, visual: { ...sel, anchor: hit.start }, cursor: end, curswant: end.col };
}

// ---------------------------------------------------------------- operators

const spaces = (n: number): string => " ".repeat(Math.max(0, n));

/** The block rows: each row's text inside the block, and the block width. */
function blockRows(
  lines: readonly string[],
  g: Geometry,
  padShort: boolean,
): { rows: string[]; width: number } {
  const slice = (text: string): string => text.slice(g.left, g.eol ? undefined : g.right + 1);
  const width = g.eol
    ? Math.max(0, ...lines.slice(g.start.line, g.end.line + 1).map((text) => text.length - g.left))
    : g.right - g.left + 1;
  const rows = lines
    .slice(g.start.line, g.end.line + 1)
    .map((text) => (text.length < g.left && padShort ? spaces(width) : slice(text)));
  return { rows, width };
}

function blockWithout(lines: readonly string[], g: Geometry): string[] {
  return lines.map((text, i) => {
    if (i < g.start.line || i > g.end.line) return text;
    return text.slice(0, g.left) + (g.eol ? "" : text.slice(g.right + 1));
  });
}

/** What a character selection holds, and the buffer without it. */
function charText(lines: readonly string[], g: Geometry): { register: Register; lines: string[] } {
  const { start, end } = g;
  const endLength = lineLength(lines, end.line);
  // The line break is selected too when the end is past the last character.
  const withBreak = end.col >= endLength && end.line < lines.length - 1;
  const first = lines[start.line] as string;
  const last = lines[end.line] as string;
  const pieces =
    start.line === end.line
      ? [first.slice(start.col, end.col + 1)]
      : [
          first.slice(start.col),
          ...lines.slice(start.line + 1, end.line),
          last.slice(0, end.col + 1),
        ];
  if (withBreak) pieces.push("");
  const tail = withBreak ? (lines[end.line + 1] as string) : last.slice(end.col + 1);
  const rest = end.line + (withBreak ? 2 : 1);
  return {
    register: { lines: pieces, linewise: false },
    lines: [...lines.slice(0, start.line), first.slice(0, start.col) + tail, ...lines.slice(rest)],
  };
}

/** The cursor after a yank or a change in line mode: the top end keeps its column. */
function lineCursor(state: VimState, g: Geometry): Pos {
  const { anchor } = state.visual as VisualSel;
  return cmp(state.cursor, anchor) < 0 ? state.cursor : { line: g.start.line, col: 0 };
}

/** The start of the selection, where the cursor goes after most commands. */
function startOf(state: VimState, g: Geometry): Pos {
  if (g.kind === "line") return lineCursor(state, g);
  if (g.kind === "block") return { line: g.start.line, col: g.left };
  return g.start;
}

function mapSelection(
  lines: readonly string[],
  g: Geometry,
  change: (text: string, at: number) => string,
): string[] {
  return lines.map((text, i) => {
    if (i < g.start.line || i > g.end.line) return text;
    let from = 0;
    let to = text.length;
    if (g.kind === "char") {
      from = i === g.start.line ? g.start.col : 0;
      to = i === g.end.line ? Math.min(text.length, g.end.col + 1) : text.length;
    } else if (g.kind === "block") {
      from = g.left;
      to = g.eol ? text.length : Math.min(text.length, g.right + 1);
    }
    if (from >= to) return text;
    const middle = [...text.slice(from, to)].map((ch, k) => change(ch, from + k)).join("");
    return text.slice(0, from) + middle + text.slice(to);
  });
}

const toggle = (ch: string): string =>
  ch === ch.toUpperCase() ? ch.toLowerCase() : ch.toUpperCase();

function startSession(
  state: VimState,
  lines: readonly string[],
  at: Pos,
  block?: BlockInsert,
): VimState {
  const session: Session = {
    before: snapshot(state, at),
    count: 1,
    opened: "here",
    change: { count: null, keys: ["c"] },
    typed: [],
    noRepeat: true,
    ...(block === undefined ? {} : { block }),
  };
  return { ...state, lines, mode: "insert", cursor: at, curswant: at.col, pending: [], session };
}

function runOperator(state: VimState, name: string, count: number | null, arg: string): VimState {
  const g = geometry(state);
  const lines = state.lines;
  const base = leave(state);
  const before = (at: Pos): ReturnType<typeof snapshot> =>
    snapshot(state, normalCursor(lines, at.line, at.col));
  const edited = (next: string[], at: Pos, register: Register | null = null): VimState => {
    const moved = withCursor({ ...base, lines: next }, at.line, at.col);
    return withUndo(state, before(at), register === null ? moved : { ...moved, register });
  };

  switch (name) {
    case "y": {
      let register: Register;
      if (g.kind === "line") {
        register = { lines: lines.slice(g.start.line, g.end.line + 1), linewise: true };
      } else if (g.kind === "char") {
        register = charText(lines, g).register;
      } else {
        const { rows, width } = blockRows(lines, g, true);
        register = { lines: rows, linewise: false, block: width };
      }
      const at = startOf(state, g);
      return { ...withCursor(base, at.line, at.col), register };
    }
    case "d":
    case "x": {
      if (g.kind === "line") {
        const rest = [...lines.slice(0, g.start.line), ...lines.slice(g.end.line + 1)];
        const next = rest.length === 0 ? [""] : rest;
        const line = Math.min(g.start.line, next.length - 1);
        const register = { lines: lines.slice(g.start.line, g.end.line + 1), linewise: true };
        // With nostartofline the cursor keeps its wanted column.
        return edited(next, { line, col: state.curswant }, register);
      }
      if (g.kind === "char") {
        const cut = charText(lines, g);
        return edited(cut.lines, g.start, cut.register);
      }
      const { rows, width } = blockRows(lines, g, false);
      return edited(
        blockWithout(lines, g),
        { line: g.start.line, col: g.left },
        {
          lines: rows,
          linewise: false,
          block: width,
        },
      );
    }
    case "c":
    case "s": {
      if (g.kind === "line") {
        const kept = [...lines.slice(0, g.start.line), "", ...lines.slice(g.end.line + 1)];
        const register = { lines: lines.slice(g.start.line, g.end.line + 1), linewise: true };
        return startSession({ ...base, register }, kept, { line: g.start.line, col: 0 });
      }
      if (g.kind === "char") {
        const cut = charText(lines, g);
        return startSession({ ...base, register: cut.register }, cut.lines, g.start);
      }
      const { rows, width } = blockRows(lines, g, false);
      const next = blockWithout(lines, g);
      const top = g.start.line;
      const block: BlockInsert = {
        top,
        bottom: g.end.line,
        col: g.left,
        left: g.left,
        home: false,
        at: g.eol ? "end" : "col",
        pad: false,
        length: (next[top] as string).length,
      };
      const register = { lines: rows, linewise: false, block: width };
      return startSession({ ...base, register }, next, { line: top, col: g.left }, block);
    }
    case "~": {
      const next = mapSelection(lines, g, toggle);
      const at = startOf(state, g);
      return edited(next, at);
    }
    case "r": {
      const next = mapSelection(lines, g, () => arg);
      return edited(next, startOf(state, g));
    }
    case ">":
    case "<": {
      if (g.kind === "block") return state;
      const amount = count ?? 1;
      const next = lines.map((text, i) =>
        i >= g.start.line && i <= g.end.line ? shiftLine(text, name, amount) : text,
      );
      const moved = withCursor({ ...base, lines: next }, g.start.line, state.curswant);
      const kept = { ...moved, curswant: state.curswant };
      return withUndo(state, before({ line: g.start.line, col: state.cursor.col }), kept);
    }
    default: {
      // J
      const from = g.start.line;
      let n = Math.max(2, g.end.line - from + 1);
      n = Math.min(n, lines.length - from);
      if (n < 2) return base;
      const joined = joinLines(lines, from, n);
      return edited(joined.lines, { line: from, col: joined.col });
    }
  }
}

/** `I` and `A` on a block: the text typed on the first row goes on every row. */
function blockInsert(state: VimState, name: string): VimState {
  const g = geometry(state);
  if (g.kind !== "block") return { ...state, pending: [] };
  const base = leave(state);
  const top = g.start.line;
  const append = name === "A";
  const col = append ? (g.eol ? lineLength(state.lines, top) : g.right + 1) : g.left;
  const text = state.lines[top] as string;
  const first = append && text.length < col ? text + spaces(col - text.length) : text;
  const lines = replaceLine(state.lines, top, first);
  const block: BlockInsert = {
    top,
    bottom: g.end.line,
    col,
    left: g.left,
    home: true,
    at: append && g.eol ? "end" : "col",
    pad: append,
    length: first.length,
  };
  const at = { line: top, col };
  return startSession({ ...base, lines: state.lines }, lines, at, block);
}

/** Esc after a block insert: copy the new text to the other rows. */
export function finishBlockInsert(state: VimState, session: Session): VimState {
  const block = session.block as BlockInsert;
  const keys = session.typed.filter((key) => key !== "<Esc>");
  const plain = keys.every((key) => key.length === 1);
  const top = state.lines[block.top] as string;
  const grown = top.length - block.length;
  if (!plain || grown <= 0) return state;
  const text = keys.join("");
  const lines = state.lines.map((row, i) => {
    if (i <= block.top || i > block.bottom) return row;
    if (block.at === "end") return row + text;
    if (row.length < block.col) {
      return block.pad ? row + spaces(block.col - row.length) + text : row;
    }
    if (row.length === block.col && !block.pad) return row;
    return row.slice(0, block.col) + text + row.slice(block.col);
  });
  const next = { ...state, lines };
  if (!block.home) return next;
  const cursor = normalCursor(lines, block.top, block.left);
  return { ...next, cursor, curswant: cursor.col };
}

// ---------------------------------------------------------------- keys

const KINDS: Readonly<Record<string, VisualKind>> = { v: "char", V: "line", "<C-v>": "block" };

/** One key typed in visual mode. */
export function pressVisual(state: VimState, key: Key): VimState {
  if (key === "<Esc>") return leave(state);
  const keys = [...state.pending, key];
  const parsed = parseVisual(keys);
  switch (parsed.kind) {
    case "incomplete":
      return { ...state, pending: keys };
    case "invalid":
      return { ...state, pending: [] };
    case "motion":
      return {
        ...visualMotion({ ...state, pending: [] }, parsed.motion, parsed.count),
        pending: [],
      };
    case "object":
      return { ...selectObject(state, parsed.object, parsed.count), pending: [] };
    case "command":
      break;
  }
  const { name, count, arg } = parsed;
  const sel = state.visual as VisualSel;
  const kind = KINDS[name];
  if (kind !== undefined) {
    return kind === sel.kind ? leave(state) : { ...state, visual: { ...sel, kind }, pending: [] };
  }
  switch (name) {
    case "o":
    case "O": {
      const swapCols = name === "O" && sel.kind === "block";
      const anchor = swapCols ? { line: sel.anchor.line, col: state.cursor.col } : state.cursor;
      const cursor = swapCols ? { line: state.cursor.line, col: sel.anchor.col } : sel.anchor;
      return {
        ...state,
        visual: { ...sel, anchor },
        cursor,
        curswant: cursor.col,
        pending: [],
      };
    }
    case ":": {
      const left = leave(state);
      return { ...left, mode: "cmdline", cmdline: "'<,'>" };
    }
    case "I":
    case "A":
      return blockInsert(state, name);
    default:
      return runOperator(state, name, count, arg);
  }
}
