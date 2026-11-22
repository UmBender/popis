import type { OutputCheckKind } from "./check-output";
import type { MemoryState } from "./memory";

export const GDB_OUT_KINDS = [
  "formato",
  "char",
  "expressao",
  "array",
  "string",
  "struct",
  "ponteiro",
  "sizeof",
  "memoria",
] as const;

export type GdbOutKind = (typeof GDB_OUT_KINDS)[number];
export type GdbOutLevel = 1 | 2 | 3;

export const GDB_OUT_LEVELS: readonly GdbOutLevel[] = [1, 2, 3];

export const GDB_OUT_KIND_LABELS: Readonly<Record<GdbOutKind, string>> = {
  formato: "Formatos (p/x, /d, /u, /o, /t)",
  char: "Caractere (char e p/c)",
  expressao: "Expressões (divisão C, casts)",
  array: "Arrays (fatias @ e <repeats>)",
  string: "Strings (char[] e \\000)",
  struct: "Structs (campos e aninhamento)",
  ponteiro: "Ponteiros (*, ->, nullptr, whatis)",
  sizeof: "sizeof e padding",
  memoria: "Memória (x/Nfu e endianness)",
};

export type OutputLocal = {
  readonly name: string;
  readonly value: string;
};

export type GdbOutputItem = {
  readonly seed: number;
  readonly index: number;
  readonly level: GdbOutLevel;
  readonly kind: GdbOutKind;
  readonly kc: `gdb.out.${GdbOutKind}`;
  readonly file: string;
  readonly lines: readonly string[];
  readonly stopLine: number;
  readonly locals: readonly OutputLocal[];
  readonly command: string;
  readonly commandKind: OutputCheckKind;
  readonly canonical: string;
  readonly reason: string;
  readonly state: MemoryState;
};

export function generateOutputItem(
  _seed: number,
  _index: number,
  _level: GdbOutLevel,
  _kinds: readonly GdbOutKind[],
): GdbOutputItem {
  throw new Error("todo");
}
