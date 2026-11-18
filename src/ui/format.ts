import type { Problem } from "../core/problem";

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
  "division.cpp-div": "C++ /",
  "division.cpp-mod": "C++ %",
  "division.floor": "Piso",
  "division.ceil": "Teto",
  "division.mod": "mod",
  "division.inequality": "Desigualdade",
  "algebra.expand": "Expandir",
  "algebra.simplify": "Simplificar",
  "algebra.square": "Completar o quadrado",
  "algebra.divide": "Dividir",
};

/** The answer as shown to the player: "2) int64" for a multiple-choice one. */
export function answerText(problem: Problem): string {
  void problem;
  throw new Error("todo");
}

export function skillLabel(skill: string): string {
  return SKILL_LABELS[skill] ?? skill;
}

/** Milliseconds as seconds with two decimals and a decimal comma: "1,50 s". */
export function seconds(ms: number): string {
  return `${(ms / 1000).toFixed(2).replace(".", ",")} s`;
}
