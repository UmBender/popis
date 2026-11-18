const SKILL_LABELS: Readonly<Record<string, string>> = {
  "arithmetic.add": "Adição",
  "arithmetic.sub": "Subtração",
  "arithmetic.mul": "Multiplicação",
  "arithmetic.div": "Divisão",
  "factoring.monic": "Quadrática mônica",
  "factoring.nonmonic": "Quadrática não mônica",
  "factoring.common": "Fator comum",
  "factoring.special": "Produtos notáveis",
  "factoring.cubic": "Cúbica",
  "factoring.twovar": "Duas variáveis",
};

export function skillLabel(skill: string): string {
  return SKILL_LABELS[skill] ?? skill;
}

/** Milliseconds as seconds with two decimals and a decimal comma: "1,50 s". */
export function seconds(ms: number): string {
  return `${(ms / 1000).toFixed(2).replace(".", ",")} s`;
}
