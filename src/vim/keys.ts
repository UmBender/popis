/**
 * A key in Vim notation: one character ("w", " ", "<"), or a name in angle
 * brackets: "<Esc>", "<CR>", "<BS>", "<Tab>", "<C-v>".
 */
export type Key = string;

/** The part of a keyboard event the engine reads. */
export type KeyInput = {
  readonly key: string;
  readonly ctrlKey: boolean;
  readonly altKey: boolean;
  readonly metaKey: boolean;
};

/** "3fx<CR>" to ["3", "f", "x", "<CR>"]. Throws on an unknown `<name>`. */
export function parseKeys(_text: string): Key[] {
  throw new Error("todo");
}

/** The inverse of `parseKeys`. */
export function formatKeys(_keys: readonly Key[]): string {
  throw new Error("todo");
}

/** The Vim key of a keyboard event, or null when it is not a Vim key. */
export function keyFromEvent(_event: KeyInput): Key | null {
  throw new Error("todo");
}
