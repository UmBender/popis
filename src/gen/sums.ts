import type { Generator, Problem } from "../core/problem";
import type { Fraction } from "../math/fraction";
import type { KindSettings } from "./kinds";

export type SumsKind = "sum" | "loop";

export const SUMS_KINDS: readonly SumsKind[] = ["sum", "loop"];

export type SumsSettings = KindSettings<SumsKind>;

export const DEFAULT_SUMS: SumsSettings = { kinds: SUMS_KINDS };

export function skillOfKind(kind: SumsKind): string {
  return `sums.${kind}`;
}

/**
 * Closed form in x of `count(n)` for n ≥ 1: interpolated by finite
 * differences on the first points and checked on the others; null when
 * the count is not a polynomial of low degree.
 */
export function closedForm(_count: (n: number) => number): Fraction | null {
  throw new Error("todo");
}

export const sums: Generator<SumsSettings> = {
  id: "sums",

  generate(_seed: number, _params: SumsSettings): Problem {
    throw new Error("todo");
  },

  /** Any expression in n with the value of the answer (ADR-T08-1). */
  check(_problem: Problem, _input: string): boolean {
    throw new Error("todo");
  },
};
