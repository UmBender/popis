import {
  add,
  constant,
  equals,
  format,
  isConstant,
  mul,
  pow,
  PolyOverflowError,
  terms,
  type Poly,
  type VariableNames,
} from "./poly";

/**
 * A polynomial over a positive integer denominator (ADR-T08-1), reduced:
 * the coefficients of `poly` and `denom` have no common factor.
 */
export type Fraction = { readonly poly: Poly; readonly denom: number };

function gcd(a: number, b: number): number {
  let [p, q] = [Math.abs(a), Math.abs(b)];
  while (q !== 0) [p, q] = [q, p % q];
  return p;
}

/** Product of two denominators, or PolyOverflowError past safe integers. */
function times(a: number, b: number): number {
  const product = a * b;
  if (!Number.isSafeInteger(product)) throw new PolyOverflowError(`denominator ${product}`);
  return product;
}

/** `poly / denom`, reduced and with a positive denominator. */
export function fraction(poly: Poly, denom: number): Fraction {
  if (!Number.isSafeInteger(denom) || denom === 0) {
    throw new RangeError(`invalid denominator ${denom}`);
  }
  let common = denom;
  for (const c of poly.values()) common = gcd(common, c);
  const k = denom < 0 ? -Math.abs(common) : Math.abs(common);
  if (k === 1) return { poly, denom };
  return { poly: new Map([...poly].map(([key, c]) => [key, c / k])), denom: denom / k };
}

export function addFractions(a: Fraction, b: Fraction): Fraction {
  const sum = add(mul(a.poly, constant(b.denom)), mul(b.poly, constant(a.denom)));
  return fraction(sum, times(a.denom, b.denom));
}

export function mulFractions(a: Fraction, b: Fraction): Fraction {
  return fraction(mul(a.poly, b.poly), times(a.denom, b.denom));
}

/** `a / b` for a constant, non-zero `b`; null otherwise. */
export function divFractions(a: Fraction, b: Fraction): Fraction | null {
  const divisor = terms(b.poly)[0]?.coef;
  if (!isConstant(b.poly) || divisor === undefined) return null;
  return fraction(mul(a.poly, constant(b.denom)), times(a.denom, divisor));
}

export function powFraction(a: Fraction, n: number): Fraction {
  let denom = 1;
  for (let i = 0; i < n; i++) denom = times(denom, a.denom);
  return fraction(pow(a.poly, n), denom);
}

/** Same value, compared by cross-multiplication; false on overflow. */
export function sameValue(a: Fraction, b: Fraction): boolean {
  try {
    return equals(mul(a.poly, constant(b.denom)), mul(b.poly, constant(a.denom)));
  } catch (error) {
    if (error instanceof PolyOverflowError) return false;
    throw error;
  }
}

/** "(n² + n)/2", "n/2" or, over 1, the polynomial alone. */
export function formatFraction(f: Fraction, names: VariableNames = {}): string {
  const body = format(f.poly, names);
  if (f.denom === 1) return body;
  return terms(f.poly).length > 1 ? `(${body})/${f.denom}` : `${body}/${f.denom}`;
}
