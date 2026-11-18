import type { Generator, Problem } from "../core/problem";

export type Level = 1 | 2 | 3 | 4 | 5 | 6;

export const LEVELS: readonly Level[] = [1, 2, 3, 4, 5, 6];

export type FactoringSettings = { readonly levels: readonly Level[] };

export type FactoringError = "no-level";

export const DEFAULT_FACTORING: FactoringSettings = { levels: [1] };

/** Skill name of a level, e.g. "factoring.monic". */
export function skillOfLevel(_level: Level): string {
  throw new Error("todo");
}

export function validateFactoring(_settings: FactoringSettings): FactoringError[] {
  throw new Error("todo");
}

/** Settings from untrusted JSON, or null when the shape or values are wrong. */
export function parseFactoringSettings(_value: unknown): FactoringSettings | null {
  throw new Error("todo");
}

export const factoring: Generator<FactoringSettings> = {
  id: "factoring",
  generate(_seed: number, _params: FactoringSettings): Problem {
    throw new Error("todo");
  },
  check(_problem: Problem, _input: string): boolean {
    throw new Error("todo");
  },
};
