import type { Poly } from "./poly";

/** Longest accepted input, in characters. */
export const MAX_INPUT = 80;
/** Largest accepted exponent. */
export const MAX_EXPONENT = 12;
/** Largest total degree of any intermediate result. */
export const MAX_DEGREE = 24;

export type Parsed = {
  /** The expanded polynomial. */
  readonly poly: Poly;
  /** Non-constant factors of the top-level product (ADR-T02-1). */
  readonly factors: number;
};

/** Parses a typed expression, or returns null when it is not valid. */
export function parse(_input: string): Parsed | null {
  throw new Error("todo");
}
