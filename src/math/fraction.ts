import type { Poly, VariableNames } from "./poly";

/**
 * A polynomial over a positive integer denominator (ADR-T08-1), reduced:
 * the coefficients of `poly` and `denom` have no common factor.
 */
export type Fraction = { readonly poly: Poly; readonly denom: number };

/** `poly / denom`, reduced and with a positive denominator. */
export function fraction(_poly: Poly, _denom: number): Fraction {
  throw new Error("todo");
}

export function addFractions(_a: Fraction, _b: Fraction): Fraction {
  throw new Error("todo");
}

export function mulFractions(_a: Fraction, _b: Fraction): Fraction {
  throw new Error("todo");
}

/** `a / b` for a constant, non-zero `b`; null otherwise. */
export function divFractions(_a: Fraction, _b: Fraction): Fraction | null {
  throw new Error("todo");
}

export function powFraction(_a: Fraction, _n: number): Fraction {
  throw new Error("todo");
}

/** Same value, compared by cross-multiplication; false on overflow. */
export function sameValue(_a: Fraction, _b: Fraction): boolean {
  throw new Error("todo");
}

/** "(n² + n)/2", "n/2" or, over 1, the polynomial alone. */
export function formatFraction(_f: Fraction, _names?: VariableNames): string {
  throw new Error("todo");
}
