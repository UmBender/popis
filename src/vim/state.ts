import type { Key } from "./keys";

/** A position in the buffer; both 0-based. */
export type Pos = { readonly line: number; readonly col: number };

export type FindKind = "f" | "F" | "t" | "T";

/** 1 forward, -1 backward. */
export type SearchDir = 1 | -1;

/** A literal pattern; `*` and `#` ask for word boundaries (`\<` and `\>`). */
export type SearchSpec = {
  readonly pattern: string;
  readonly startWord: boolean;
  readonly endWord: boolean;
};

/**
 * The editor state of normal mode (ADR-T13-1). Immutable: every movement
 * returns a new state.
 */
export type VimState = {
  readonly lines: readonly string[];
  readonly cursor: Pos;
  /** The column `j` and `k` aim for; Infinity after `$`. */
  readonly curswant: number;
  /** The keys of the command being typed, such as ["2", "f"] or ["/", "a"]. */
  readonly pending: readonly Key[];
  readonly lastFind: { readonly kind: FindKind; readonly char: string } | null;
  readonly lastSearch: { readonly spec: SearchSpec; readonly dir: SearchDir } | null;
};

/** A state with the cursor clamped into the buffer. */
export function createState(lines: readonly string[], cursor: Pos): VimState {
  const buffer = lines.length === 0 ? [""] : lines;
  const line = Math.min(Math.max(cursor.line, 0), buffer.length - 1);
  const length = (buffer[line] as string).length;
  const col = Math.min(Math.max(cursor.col, 0), Math.max(0, length - 1));
  return {
    lines: buffer,
    cursor: { line, col },
    curswant: col,
    pending: [],
    lastFind: null,
    lastSearch: null,
  };
}
