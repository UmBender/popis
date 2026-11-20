import type { Key } from "./keys";
import type { Pos, Snapshot, UndoStep, VimState } from "./state";

export type Mut = { line: number; col: number };

export const cmp = (a: Pos, b: Pos): number => a.line - b.line || a.col - b.col;

export const lineLength = (lines: readonly string[], line: number): number =>
  (lines[line] as string).length;

/** The cursor in normal mode: inside the line, on its last character at most. */
export function normalCursor(lines: readonly string[], line: number, col: number): Pos {
  const last = Math.max(0, lineLength(lines, line) - 1);
  return { line, col: Math.max(0, Math.min(col, last)) };
}

export function withCursor(state: VimState, line: number, col: number): VimState {
  const cursor = normalCursor(state.lines, line, col);
  return { ...state, cursor, curswant: cursor.col };
}

/** Vim's beginline(BL_WHITE | BL_FIX): the first non-blank, or the last character. */
export function firstNonBlank(text: string): number {
  const at = text.search(/\S/);
  return at >= 0 ? at : Math.max(0, text.length - 1);
}

export const replaceLine = (lines: readonly string[], at: number, text: string): string[] =>
  lines.map((l, i) => (i === at ? text : l));

export const sameLines = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((l, i) => l === b[i]);

/** Pushes an undo step when the buffer changed, and drops the redo steps. */
export function withUndo(prev: VimState, before: Snapshot, next: VimState): VimState {
  if (sameLines(before.lines, next.lines)) return next;
  const step: UndoStep = { before, after: { lines: next.lines, cursor: next.cursor } };
  return { ...next, undo: [...prev.undo, step], redo: [] };
}

export const snapshot = (state: VimState, cursor: Pos = state.cursor): Snapshot => ({
  lines: state.lines,
  cursor,
});

/** `shiftwidth`, with `expandtab` (ADR-T15-1). */
export const SHIFT_WIDTH = 4;

/** `>` or `<` on one line, `amount` shifts; an empty line stays empty. */
export function shiftLine(text: string, dir: ">" | "<", amount: number): string {
  if (text === "") return text;
  if (dir === ">") return " ".repeat(SHIFT_WIDTH * amount) + text;
  let remove = SHIFT_WIDTH * amount;
  let at = 0;
  while (remove > 0 && (text.charAt(at) === " " || text.charAt(at) === "\t")) {
    remove = text.charAt(at) === " " ? remove - 1 : 0;
    at++;
  }
  return text.slice(at);
}

/** `count` lines from `from` joined the way `J` does; `col` is where the cursor goes. */
export function joinLines(
  lines: readonly string[],
  from: number,
  count: number,
): { readonly lines: string[]; readonly col: number } {
  let text = lines[from] as string;
  let col = 0;
  for (let k = 1; k < count; k++) {
    const next = (lines[from + k] as string).replace(/^[ \t]+/, "");
    col = text.length;
    const spaced = text !== "" && !/[ \t]$/.test(text) && next !== "" && !next.startsWith(")");
    text += (spaced ? " " : "") + next;
  }
  return {
    lines: [...lines.slice(0, from), text, ...lines.slice(from + count)],
    col,
  };
}

/** The keys of a count, in Vim notation. */
export const countKeys = (count: number | null): Key[] =>
  count === null ? [] : [...String(count)];
