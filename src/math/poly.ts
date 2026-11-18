/** The variables a polynomial may use. */
export type Variable = "x" | "y";

/**
 * Sparse polynomial in x and y with integer coefficients, keyed by
 * monomial ("ex,ey"). Zero coefficients are never stored.
 */
export type Poly = ReadonlyMap<string, number>;

/** One term: coef · x^ex · y^ey. */
export type Term = { readonly ex: number; readonly ey: number; readonly coef: number };

/** A coefficient left the safe-integer range. */
export class PolyOverflowError extends Error {}

export function monomial(_coef: number, _ex: number, _ey: number): Poly {
  throw new Error("todo");
}

export function constant(_c: number): Poly {
  throw new Error("todo");
}

export function variable(_v: Variable): Poly {
  throw new Error("todo");
}

export function add(_p: Poly, _q: Poly): Poly {
  throw new Error("todo");
}

export function neg(_p: Poly): Poly {
  throw new Error("todo");
}

export function sub(_p: Poly, _q: Poly): Poly {
  throw new Error("todo");
}

export function mul(_p: Poly, _q: Poly): Poly {
  throw new Error("todo");
}

export function pow(_p: Poly, _n: number): Poly {
  throw new Error("todo");
}

export function equals(_p: Poly, _q: Poly): boolean {
  throw new Error("todo");
}

/** Total degree; 0 for non-zero constants and -1 for the zero polynomial. */
export function degree(_p: Poly): number {
  throw new Error("todo");
}

export function isConstant(_p: Poly): boolean {
  throw new Error("todo");
}

/** Terms by total degree, highest first, then by power of x, highest first. */
export function terms(_p: Poly): Term[] {
  throw new Error("todo");
}

/** Display form: "x² − 5xy + 6y²". */
export function format(_p: Poly): string {
  throw new Error("todo");
}
