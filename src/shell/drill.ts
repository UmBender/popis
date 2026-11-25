import type { ShellExpected } from "./check";

export const SHELL_DRILL_KINDS = [
  "arquivos",
  "compilar",
  "rodar",
  "comparar",
  "stress",
  "limites",
  "texto",
  "setup",
] as const;

export type ShellDrillKind = (typeof SHELL_DRILL_KINDS)[number];

export const SHELL_DRILL_KIND_LABELS: Readonly<Record<ShellDrillKind, string>> = {
  arquivos: "Arquivos (ls, cd, mkdir, cp, mv, cat, rm)",
  compilar: "Compilar (g++, avisos, sanitizers)",
  rodar: "Rodar (<, >, 2>, tee, time, timeout)",
  comparar: "Comparar (diff, -Z, -w, cmp, <())",
  stress: "Stress test (for/while, || break)",
  limites: "Limites (ulimit -s, -v, -a)",
  texto: "Texto (head, tail, wc, sort, uniq, grep)",
  setup: "Setup (alias, função, source)",
};

export type ShellDrillItem = {
  readonly seed: number;
  readonly index: number;
  readonly kind: ShellDrillKind;
  readonly kc: `shell.${ShellDrillKind}`;
  readonly prompt: string;
  readonly mentionedFiles: readonly string[];
  readonly cwd: string;
  readonly files: readonly string[];
  readonly terminalLines: readonly string[];
  readonly canonical: string;
  readonly alternatives: readonly string[];
  readonly expected: ShellExpected;
  readonly oracleFixture: string;
  readonly oracleProbe?: string;
};

export function generateShellItem(
  _seed: number,
  _index: number,
  _kinds: readonly ShellDrillKind[],
): ShellDrillItem {
  throw new Error("todo");
}
