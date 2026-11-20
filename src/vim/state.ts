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

export type Mode = "normal" | "insert" | "visual" | "cmdline";

/**
 * The unnamed register: text by characters, or whole lines (ADR-T14-1). A
 * block (ADR-T15-1) has `block`, its width.
 */
export type Register = {
  readonly lines: readonly string[];
  readonly linewise: boolean;
  readonly block?: number;
};

/** A macro being recorded into register `name`; `keys` are the keys typed so far. */
export type Recording = { readonly name: string; readonly keys: readonly Key[] };

export type VisualKind = "char" | "line" | "block";

/** A selection in progress: the cursor is the other end (ADR-T15-1). */
export type VisualSel = { readonly kind: VisualKind; readonly anchor: Pos };

/** The last selection, for `gv` and the marks `'<` and `'>`. */
export type VisualMark = {
  readonly kind: VisualKind;
  readonly anchor: Pos;
  readonly cursor: Pos;
};

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
  /** The `.` after a visual command does not repeat it (ADR-T15-1). */
  readonly noRepeat?: boolean;
  /** A block insert (`I`, `A`, `$A`) to copy to the other rows on Esc. */
  readonly block?: BlockInsert;
};

/** Where a block insert goes: rows, the column on the first row, and the kind. */
export type BlockInsert = {
  readonly top: number;
  readonly bottom: number;
  readonly col: number;
  /** The left edge of the block; with `home` the cursor ends there on the top row. */
  readonly left: number;
  readonly home: boolean;
  /** Text goes at `col` on each row, or at the end of each row. */
  readonly at: "col" | "end";
  /** Pad short rows with spaces up to `col` (`A`). */
  readonly pad: boolean;
  /** Length of the first row before the insert. */
  readonly length: number;
};

/**
 * The editor state (ADR-T13-1, ADR-T14-1). Immutable: every key returns a new
 * state.
 */
export type VimState = {
  readonly mode: Mode;
  /** The unnamed register (`""`). */
  readonly register: Register | null;
  /** The registers `0`-`9`, `-` and `a`-`z` that hold something (ADR-T16-1). */
  readonly registers: Readonly<Record<string, Register>>;
  /** The macro being recorded, or null. */
  readonly recording: Recording | null;
  /** The letter of the macro `@@` runs again. */
  readonly lastMacro: string | null;
  /** The last key was a command that failed (Vim beeps); a running macro stops. */
  readonly failed: boolean;
  readonly undo: readonly UndoStep[];
  readonly redo: readonly UndoStep[];
  readonly lastChange: Change | null;
  readonly session: Session | null;
  readonly visual: VisualSel | null;
  readonly lastVisual: VisualMark | null;
  /** The text of the command line (after the colon) in `cmdline` mode. */
  readonly cmdline: string | null;
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
    registers: {},
    recording: null,
    lastMacro: null,
    failed: false,
    undo: [],
    redo: [],
    lastChange: null,
    session: null,
    visual: null,
    lastVisual: null,
    cmdline: null,
    lines: buffer,
    cursor: { line, col },
    curswant: col,
    pending: [],
    lastFind: null,
    lastSearch: null,
  };
}
