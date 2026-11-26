/** The eight competitive-programming bug classes of T41 (ADR-T41-1). */
export const WA_CLASSES = [
  "overflow",
  "limite",
  "multitest",
  "borda",
  "precisao",
  "desempenho",
  "stl",
  "leitura",
] as const;

export type WaClass = (typeof WA_CLASSES)[number];

export const WA_CLASS_LABELS: Readonly<Record<WaClass, string>> = {
  overflow: "Overflow de inteiro",
  limite: "Limite ou índice fora da faixa",
  multitest: "Estado entre casos (multitest)",
  borda: "Caso de borda",
  precisao: "Precisão de ponto flutuante",
  desempenho: "Desempenho (TLE)",
  stl: "Armadilha da STL",
  leitura: "Leitura ou formato de saída",
};

const CLASS_SET: ReadonlySet<string> = new Set(WA_CLASSES);

export function isWaClass(value: unknown): value is WaClass {
  return typeof value === "string" && CLASS_SET.has(value);
}

export function waClassLabel(bugClass: WaClass): string {
  return WA_CLASS_LABELS[bugClass];
}
