/** The six diagnostic and verdict groups of T40 (ADR-T40-1). */
export const COMPILE_GROUPS = [
  "compilacao",
  "aviso",
  "asan",
  "ubsan",
  "glibcxx",
  "veredito",
] as const;

export type CompileGroup = (typeof COMPILE_GROUPS)[number];

export const COMPILE_GROUP_LABELS: Readonly<Record<CompileGroup, string>> = {
  compilacao: "Compilação",
  aviso: "Avisos",
  asan: "ASan",
  ubsan: "UBSan",
  glibcxx: "GLIBCXX_DEBUG",
  veredito: "Veredito",
};

/** Every cause identifier across the six groups (5 per group = 30). */
export const CAUSE_IDS = [
  // compilacao
  "nao-declarado",
  "ponto-e-virgula",
  "chamada-incompativel",
  "escrita-em-const",
  "redeclaracao",
  // aviso
  "sombra-variavel",
  "nao-inicializada",
  "printf-tipo",
  "comparacao-sinal",
  "sem-retorno",
  // asan
  "heap-fora-limites",
  "stack-fora-limites",
  "uso-apos-liberar",
  "estouro-pilha",
  "global-fora-limites",
  // ubsan
  "overflow-sinal",
  "divisao-zero",
  "shift-invalido",
  "indice-fora-array",
  "ponteiro-nulo",
  // glibcxx
  "indice-fora-vetor",
  "iterador-invalido",
  "iterador-fim",
  "comparador-invalido",
  "container-vazio",
  // veredito
  "tle-laco-infinito",
  "mle-alocacao",
  "rte-sigsegv",
  "rte-sigfpe",
  "rte-sigabrt",
] as const;

export type CauseId = (typeof CAUSE_IDS)[number];

export type CompileCause = {
  readonly id: CauseId;
  readonly group: CompileGroup;
  readonly label: string;
};

export const COMPILE_CAUSES: readonly CompileCause[] = [];

export function isCauseId(_value: unknown): _value is CauseId {
  throw new Error("todo");
}

export function causeById(_id: CauseId): CompileCause {
  throw new Error("todo");
}

export function causesForGroup(_group: CompileGroup): readonly CompileCause[] {
  throw new Error("todo");
}
