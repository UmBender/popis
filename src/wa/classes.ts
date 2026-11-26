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

export function isWaClass(_value: unknown): _value is WaClass {
  throw new Error("todo");
}

export function waClassLabel(_bugClass: WaClass): string {
  throw new Error("todo");
}
