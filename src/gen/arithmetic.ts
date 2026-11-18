import type { Generator, Problem } from "../core/problem";
import { createRng } from "../core/rng";

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

/** Bounds of every range; keeps products far below 2^53. */
export const RANGE_LIMIT = 1_000_000;

export function validateArithmetic(settings: ArithmeticSettings): SettingsError[] {
  const errors = new Set<SettingsError>();
  const ops = new Set(settings.operations);
  if (ops.size === 0) errors.add("no-operation");

  const ranges: Range[] = [];
  if (ops.has("add") || ops.has("sub")) ranges.push(settings.addLeft, settings.addRight);
  if (ops.has("mul") || ops.has("div")) ranges.push(settings.mulLeft, settings.mulRight);
  for (const { min, max } of ranges) {
    if (!Number.isInteger(min) || !Number.isInteger(max)) {
      errors.add("non-integer");
      continue;
    }
    if (min < 0 || max > RANGE_LIMIT) errors.add("out-of-bounds");
    if (min > max) errors.add("inverted-range");
  }

  const divisor = settings.mulLeft;
  if (ops.has("div") && divisor.min <= 0 && divisor.max >= 0) errors.add("division-by-zero");
  return [...errors];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseRange(value: unknown): Range | null {
  if (!isRecord(value)) return null;
  const { min, max } = value;
  if (typeof min !== "number" || typeof max !== "number") return null;
  return { min, max };
}

/** Settings from untrusted JSON, or null when the shape or values are wrong. */
export function parseArithmeticSettings(value: unknown): ArithmeticSettings | null {
  if (!isRecord(value) || !Array.isArray(value["operations"])) return null;
  const operations: Operation[] = [];
  for (const op of value["operations"] as unknown[]) {
    if (!OPERATIONS.includes(op as Operation)) return null;
    if (!operations.includes(op as Operation)) operations.push(op as Operation);
  }
  const addLeft = parseRange(value["addLeft"]);
  const addRight = parseRange(value["addRight"]);
  const mulLeft = parseRange(value["mulLeft"]);
  const mulRight = parseRange(value["mulRight"]);
  if (addLeft === null || addRight === null || mulLeft === null || mulRight === null) return null;
  const settings = { operations, addLeft, addRight, mulLeft, mulRight };
  return validateArithmetic(settings).length === 0 ? settings : null;
}

export const arithmetic: Generator<ArithmeticSettings> = {
  id: "arithmetic",

  generate(seed: number, params: ArithmeticSettings): Problem {
    const errors = validateArithmetic(params);
    if (errors.length > 0) {
      throw new RangeError(`invalid arithmetic settings: ${errors.join(", ")}`);
    }
    const rng = createRng(seed);
    const op = rng.pick(params.operations);
    const [left, right] =
      op === "add" || op === "sub" ? [params.addLeft, params.addRight] : [params.mulLeft, params.mulRight];
    const a = rng.int(left.min, left.max);
    const b = rng.int(right.min, right.max);
    const [prompt, answer] = {
      add: [`${a} + ${b}`, a + b],
      sub: [`${a + b} − ${a}`, b],
      mul: [`${a} × ${b}`, a * b],
      div: [`${a * b} ÷ ${a}`, b],
    }[op] as [string, number];
    return { skill: `arithmetic.${op}`, prompt, answer: String(answer), seed, params };
  },

  check(problem: Problem, input: string): boolean {
    return input.trim() === problem.answer;
  },
};
