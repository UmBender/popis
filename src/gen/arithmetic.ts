import type { Generator, Problem } from "../core/problem";

export type Operation = "add" | "sub" | "mul" | "div";

export const OPERATIONS: readonly Operation[] = ["add", "sub", "mul", "div"];

/** Inclusive integer range. */
export type Range = { readonly min: number; readonly max: number };

/**
 * Zetamac's settings: addition ranges also drive subtraction (its reverse),
 * multiplication ranges also drive division (its reverse).
 */
export type ArithmeticSettings = {
  readonly operations: readonly Operation[];
  readonly addLeft: Range;
  readonly addRight: Range;
  readonly mulLeft: Range;
  readonly mulRight: Range;
};

export type SettingsError =
  | "no-operation"
  | "inverted-range"
  | "non-integer"
  | "out-of-bounds"
  | "division-by-zero";

export const DEFAULT_ARITHMETIC: ArithmeticSettings = {
  operations: ["add", "sub", "mul", "div"],
  addLeft: { min: 2, max: 100 },
  addRight: { min: 2, max: 100 },
  mulLeft: { min: 2, max: 12 },
  mulRight: { min: 2, max: 100 },
};

export function validateArithmetic(_settings: ArithmeticSettings): SettingsError[] {
  throw new Error("todo");
}

/** Settings from untrusted JSON, or null when the shape or values are wrong. */
export function parseArithmeticSettings(_value: unknown): ArithmeticSettings | null {
  throw new Error("todo");
}

export const arithmetic: Generator<ArithmeticSettings> = {
  id: "arithmetic",
  generate(_seed: number, _params: ArithmeticSettings): Problem {
    throw new Error("todo");
  },
  check(_problem: Problem, _input: string): boolean {
    throw new Error("todo");
  },
};
