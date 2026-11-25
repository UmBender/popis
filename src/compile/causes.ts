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
  "nao-declarado",
  "ponto-e-virgula",
  "chamada-incompativel",
  "escrita-em-const",
  "redeclaracao",
  "sombra-variavel",
  "nao-inicializada",
  "printf-tipo",
  "comparacao-sinal",
  "sem-retorno",
  "heap-fora-limites",
  "stack-fora-limites",
  "uso-apos-liberar",
  "estouro-pilha",
  "global-fora-limites",
  "overflow-sinal",
  "divisao-zero",
  "shift-invalido",
  "indice-fora-array",
  "ponteiro-nulo",
  "indice-fora-vetor",
  "iterador-invalido",
  "iterador-fim",
  "comparador-invalido",
  "container-vazio",
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

export const COMPILE_CAUSES: readonly CompileCause[] = [
  // compilacao
  { id: "nao-declarado", group: "compilacao", label: "Variável ou função não declarada" },
  { id: "ponto-e-virgula", group: "compilacao", label: "Ponto e vírgula faltando" },
  { id: "chamada-incompativel", group: "compilacao", label: "Chamada sem sobrecarga compatível" },
  { id: "escrita-em-const", group: "compilacao", label: "Tentativa de alterar objeto const" },
  { id: "redeclaracao", group: "compilacao", label: "Redeclaração no mesmo escopo" },
  // aviso
  { id: "sombra-variavel", group: "aviso", label: "Sombra de variável (-Wshadow)" },
  { id: "nao-inicializada", group: "aviso", label: "Variável usada sem inicializar" },
  { id: "printf-tipo", group: "aviso", label: "Tipo errado no printf (-Wformat)" },
  { id: "comparacao-sinal", group: "aviso", label: "Comparação signed vs unsigned" },
  { id: "sem-retorno", group: "aviso", label: "Função sem return em todos os caminhos" },
  // asan
  { id: "heap-fora-limites", group: "asan", label: "Fora dos limites na heap (heap-buffer-overflow)" },
  { id: "stack-fora-limites", group: "asan", label: "Fora dos limites na pilha (stack-buffer-overflow)" },
  { id: "uso-apos-liberar", group: "asan", label: "Uso depois de liberar (heap-use-after-free)" },
  { id: "estouro-pilha", group: "asan", label: "Pilha estourada por recursão (stack-overflow)" },
  { id: "global-fora-limites", group: "asan", label: "Fora dos limites em array global (global-buffer-overflow)" },
  // ubsan
  { id: "overflow-sinal", group: "ubsan", label: "Overflow de inteiro com sinal" },
  { id: "divisao-zero", group: "ubsan", label: "Divisão ou resto por zero" },
  { id: "shift-invalido", group: "ubsan", label: "Shift de bits maior ou igual à largura" },
  { id: "indice-fora-array", group: "ubsan", label: "Índice fora dos limites do array fixo" },
  { id: "ponteiro-nulo", group: "ubsan", label: "Desreferência de ponteiro nulo" },
  // glibcxx
  { id: "indice-fora-vetor", group: "glibcxx", label: "Índice fora dos limites do vector" },
  { id: "iterador-invalido", group: "glibcxx", label: "Iterador invalidado após modificar contêiner" },
  { id: "iterador-fim", group: "glibcxx", label: "Desreferência do iterador end()" },
  { id: "comparador-invalido", group: "glibcxx", label: "Comparador não é ordem estrita fraca (<=)" },
  { id: "container-vazio", group: "glibcxx", label: "Acesso a elemento em contêiner vazio" },
  // veredito
  { id: "tle-laco-infinito", group: "veredito", label: "TLE — laço infinito ou tempo excedido" },
  { id: "mle-alocacao", group: "veredito", label: "MLE — alocação acima do limite de memória" },
  { id: "rte-sigsegv", group: "veredito", label: "RTE (SIGSEGV) — acesso inválido à memória" },
  { id: "rte-sigfpe", group: "veredito", label: "RTE (SIGFPE) — divisão ou resto por zero" },
  { id: "rte-sigabrt", group: "veredito", label: "RTE (SIGABRT) — asserção falhou ou abort()" },
];

const CAUSE_MAP: ReadonlyMap<CauseId, CompileCause> = new Map(COMPILE_CAUSES.map((c) => [c.id, c]));

export function isCauseId(value: unknown): value is CauseId {
  return typeof value === "string" && CAUSE_MAP.has(value as CauseId);
}

export function causeById(id: CauseId): CompileCause {
  const cause = CAUSE_MAP.get(id);
  /* v8 ignore next */
  if (cause === undefined) throw new Error(`unknown cause ${id}`);
  return cause;
}

export function causesForGroup(group: CompileGroup): readonly CompileCause[] {
  return COMPILE_CAUSES.filter((c) => c.group === group);
}
