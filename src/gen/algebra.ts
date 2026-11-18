import type { Generator, Problem } from "../core/problem";
import type { KindSettings } from "./kinds";

export type AlgebraKind = "expand" | "simplify" | "square" | "divide";

export const ALGEBRA_KINDS: readonly AlgebraKind[] = ["expand", "simplify", "square", "divide"];

export type AlgebraSettings = KindSettings<AlgebraKind>;

export const DEFAULT_ALGEBRA: AlgebraSettings = { kinds: ALGEBRA_KINDS };

export function skillOfKind(_kind: AlgebraKind): string {
  throw new Error("todo");
}

export const algebra: Generator<AlgebraSettings> = {
  id: "algebra",
  generate(_seed: number, _params: AlgebraSettings): Problem {
    throw new Error("todo");
  },
  check(_problem: Problem, _input: string): boolean {
    throw new Error("todo");
  },
};
