import type { Pos } from "../state";

/** The kinds of edit a round can ask for (AC-6). */
export const EDIT_KINDS = [
  "delete-word",
  "change-word",
  "change-parens",
  "change-brackets",
  "change-braces",
  "change-quotes",
  "delete-to-char",
  "delete-to-end",
  "delete-line",
  "duplicate-line",
  "swap-lines",
  "append-semicolon",
  "comment-line",
  "change-operator",
  "open-line",
  "change-type",
  "fix-index",
  "replace-digit",
] as const;

export type EditKind = (typeof EDIT_KINDS)[number];

/** What the checkbox of each kind says, in Portuguese. */
export const EDIT_KIND_LABELS: Readonly<Record<EditKind, string>> = {
  "delete-word": "apagar uma palavra",
  "change-word": "trocar uma palavra",
  "change-parens": "trocar o conteúdo de ( )",
  "change-brackets": "trocar o conteúdo de [ ]",
  "change-braces": "trocar o conteúdo de { }",
  "change-quotes": "trocar o conteúdo de aspas",
  "delete-to-char": "apagar até um caractere",
  "delete-to-end": "apagar até o fim da linha",
  "delete-line": "apagar uma linha",
  "duplicate-line": "duplicar uma linha",
  "swap-lines": "trocar duas linhas",
  "append-semicolon": "acrescentar ; no fim",
  "comment-line": "comentar uma linha",
  "change-operator": "trocar um operador",
  "open-line": "abrir uma linha abaixo",
  "change-type": "trocar int por long long",
  "fix-index": "corrigir um índice",
  "replace-digit": "trocar um dígito",
};

/** One edit of a round (AC-6). */
export type EditTarget = {
  readonly index: number;
  /** `deriveSeed(roundSeed, index)`. */
  readonly seed: number;
  readonly kind: EditKind;
  readonly snippetId: string;
  /** The buffer before. */
  readonly lines: readonly string[];
  readonly start: Pos;
  /** The buffer the player must reach. */
  readonly after: readonly string[];
  /** The reference solution in Vim notation, starting in normal mode. */
  readonly reference: string;
  /** Keys of the reference. */
  readonly referenceKeys: number;
};

/** The `index`-th edit of the round with `seed`, of one of the `kinds`. */
export function generateEdit(seed: number, index: number, kinds: readonly EditKind[]): EditTarget {
  void seed;
  void index;
  void kinds;
  throw new Error("todo");
}
