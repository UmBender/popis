import type { Generator, Problem } from "../core/problem";
import type { KindSettings } from "./kinds";

export type EstimationKind = "complexity" | "magnitude" | "overflow";

export const ESTIMATION_KINDS: readonly EstimationKind[] = ["complexity", "magnitude", "overflow"];

export type EstimationSettings = KindSettings<EstimationKind>;

export const DEFAULT_ESTIMATION: EstimationSettings = { kinds: ESTIMATION_KINDS };

/** Complexity classes from the most to the least expensive (ADR-T07-1). */
export const COMPLEXITY_SCALE: readonly string[] = [
  "O(n!)",
  "O(2ⁿ·n)",
  "O(n³)",
  "O(n²)",
  "O(n√n)",
  "O(n log n)",
  "O(n)",
  "O(√n)",
  "O(log n)",
];

export type IntType = "int32" | "int64" | "nenhum";

export const OVERFLOW_CHOICES: readonly IntType[] = ["int32", "int64", "nenhum"];

export const INT32_MAX = 2n ** 31n - 1n;
export const INT64_MAX = 2n ** 63n - 1n;

export function skillOfKind(kind: EstimationKind): string {
  return `estimation.${kind}`;
}

/** Non-negative integer written with superscript digits: 18 → "¹⁸". */
export function superscript(k: number): string {
  void k;
  throw new Error("todo");
}

/** The smallest signed type that holds a non-negative value. */
export function smallestType(value: bigint): IntType {
  void value;
  throw new Error("todo");
}

export const estimation: Generator<EstimationSettings> = {
  id: "estimation",

  generate(seed: number, params: EstimationSettings): Problem {
    void seed;
    void params;
    throw new Error("todo");
  },

  check(problem: Problem, input: string): boolean {
    void problem;
    void input;
    throw new Error("todo");
  },
};
