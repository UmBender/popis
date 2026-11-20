import type { Rng } from "../../core/rng";
import type { Pos } from "../state";

/** The kinds of edit that use registers, macros and `<C-a>` (T16 AC-5). */
export const REGISTER_KINDS = [
  "number-lines",
  "copy-block",
  "array-initializer",
  "declarations-to-cin",
  "swap-columns",
  "delete-debug-line",
  "paste-saved-text",
  "increment-indexes",
] as const;

export type RegisterKind = (typeof REGISTER_KINDS)[number];

/** What the checkbox of each kind says, in Portuguese. */
export const REGISTER_KIND_LABELS: Readonly<Record<RegisterKind, string>> = {
  "number-lines": "gerar as linhas 1…n com uma macro",
  "copy-block": "copiar um bloco n vezes",
  "array-initializer": "transformar números num inicializador",
  "declarations-to-cin": "trocar declarações por leituras com cin",
  "swap-columns": "trocar a ordem de duas colunas",
  "delete-debug-line": "apagar a linha de debug sem perder a cópia",
  "paste-saved-text": "colar um trecho guardado em dois lugares",
  "increment-indexes": "incrementar os índices de um bloco",
};

/** An edit before the generator adds its identity. */
export type RegisterDraft = {
  readonly lines: readonly string[];
  readonly start: Pos;
  readonly after: readonly string[];
  readonly reference: string;
};

type RegisterBuilder = (rng: Rng) => RegisterDraft;

const todo: RegisterBuilder = () => {
  throw new Error("todo");
};

export const REGISTER_BUILDERS: Readonly<Record<RegisterKind, RegisterBuilder>> = {
  "number-lines": todo,
  "copy-block": todo,
  "array-initializer": todo,
  "declarations-to-cin": todo,
  "swap-columns": todo,
  "delete-debug-line": todo,
  "paste-saved-text": todo,
  "increment-indexes": todo,
};
