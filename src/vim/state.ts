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

export type Mode = "normal" | "insert";

/** The unnamed register: text by characters, or whole lines (ADR-T14-1). */
export type Register = { readonly lines: readonly string[]; readonly linewise: boolean };

/** The buffer and the cursor at one moment. */
export type Snapshot = { readonly lines: readonly string[]; readonly cursor: Pos };

/**
 * One undo step: the buffer before the change, with the cursor where Vim saves
 * it (the start of the changed range), and the buffer after.
 */
export type UndoStep = { readonly before: Snapshot; readonly after: Snapshot };

/**
 * A change that `.` can repeat: the keys of the command without its counts,
 * the total count, and the keys typed in insert mode (up to and including Esc).
 */
export type Change = {
  readonly count: number | null;
  readonly keys: readonly Key[];
  readonly typed: readonly Key[];
};

/** An insert session in progress; it ends with Esc and is one undo step. */
export type Session = {
  readonly before: Snapshot;
  /** The count typed before the command that opened it; the text is repeated. */
  readonly count: number;
  /** How the session started: text goes in place, or on a line opened below or above. */
  readonly opened: "here" | "below" | "above";
  /** The command that started it, for `.`. */
  readonly change: Pick<Change, "count" | "keys">;
  /** Keys typed since the session started. */
  readonly typed: readonly Key[];
};

/**
 * The editor state (ADR-T13-1, ADR-T14-1). Immutable: every key returns a new
 * state.
 */
export type VimState = {
  readonly mode: Mode;
  readonly register: Register | null;
  readonly undo: readonly UndoStep[];
  readonly redo: readonly UndoStep[];
  readonly lastChange: Change | null;
  readonly session: Session | null;
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
    mode: "normal",
    register: null,
    undo: [],
    redo: [],
    lastChange: null,
    session: null,
    lines: buffer,
    cursor: { line, col },
    curswant: col,
    pending: [],
    lastFind: null,
    lastSearch: null,
  };
}
