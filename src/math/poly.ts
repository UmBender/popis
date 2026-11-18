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

const SUPERSCRIPT_DIGITS = "⁰¹²³⁴⁵⁶⁷⁸⁹";

/** Exponent as superscript digits; empty for 1. */
export function superscript(n: number): string {
  if (n === 1) return "";
  return [...String(n)].map((d) => SUPERSCRIPT_DIGITS[Number(d)]).join("");
}

function key(ex: number, ey: number): string {
  return `${ex},${ey}`;
}

function unkey(k: string): [number, number] {
  const [ex, ey] = k.split(",");
  return [Number(ex), Number(ey)];
}

function checked(n: number): number {
  if (!Number.isSafeInteger(n))
    throw new PolyOverflowError(`coefficient ${n} is not a safe integer`);
  return n;
}

/** Adds `coef` to the term `k` of `target`, dropping it when it cancels. */
function accumulate(target: Map<string, number>, k: string, coef: number): void {
  const sum = checked((target.get(k) ?? 0) + coef);
  if (sum === 0) target.delete(k);
  else target.set(k, sum);
}

export function monomial(coef: number, ex: number, ey: number): Poly {
  if (!Number.isInteger(ex) || !Number.isInteger(ey) || ex < 0 || ey < 0) {
    throw new RangeError(`invalid exponents x^${ex} y^${ey}`);
  }
  return checked(coef) === 0 ? new Map() : new Map([[key(ex, ey), coef]]);
}

export function constant(c: number): Poly {
  return monomial(c, 0, 0);
}

export function variable(v: Variable): Poly {
  return v === "x" ? monomial(1, 1, 0) : monomial(1, 0, 1);
}

export function add(p: Poly, q: Poly): Poly {
  const result = new Map(p);
  for (const [k, c] of q) accumulate(result, k, c);
  return result;
}

export function neg(p: Poly): Poly {
  return new Map([...p].map(([k, c]) => [k, -c]));
}

export function sub(p: Poly, q: Poly): Poly {
  return add(p, neg(q));
}

export function mul(p: Poly, q: Poly): Poly {
  const result = new Map<string, number>();
  for (const [kp, cp] of p) {
    const [px, py] = unkey(kp);
    for (const [kq, cq] of q) {
      const [qx, qy] = unkey(kq);
      accumulate(result, key(px + qx, py + qy), checked(cp * cq));
    }
  }
  return result;
}

export function pow(p: Poly, n: number): Poly {
  if (!Number.isInteger(n) || n < 0) throw new RangeError(`invalid exponent ${n}`);
  let result = constant(1);
  for (let i = 0; i < n; i++) result = mul(result, p);
  return result;
}

export function equals(p: Poly, q: Poly): boolean {
  if (p.size !== q.size) return false;
  for (const [k, c] of p) if (q.get(k) !== c) return false;
  return true;
}

/** Total degree; 0 for non-zero constants and -1 for the zero polynomial. */
export function degree(p: Poly): number {
  let d = -1;
  for (const k of p.keys()) {
    const [ex, ey] = unkey(k);
    d = Math.max(d, ex + ey);
  }
  return d;
}

export function isConstant(p: Poly): boolean {
  return degree(p) <= 0;
}

/** Terms by total degree, highest first, then by power of x, highest first. */
export function terms(p: Poly): Term[] {
  return [...p]
    .map(([k, coef]) => {
      const [ex, ey] = unkey(k);
      return { ex, ey, coef };
    })
    .sort((a, b) => b.ex + b.ey - (a.ex + a.ey) || b.ex - a.ex);
}

function monomialText(ex: number, ey: number): string {
  return (ex > 0 ? `x${superscript(ex)}` : "") + (ey > 0 ? `y${superscript(ey)}` : "");
}

/** Display form: "x² − 5xy + 6y²". */
export function format(p: Poly): string {
  const ts = terms(p);
  if (ts.length === 0) return "0";
  return ts
    .map(({ ex, ey, coef }, i) => {
      const body = monomialText(ex, ey);
      const abs = Math.abs(coef);
      const text = (abs === 1 && body !== "" ? "" : String(abs)) + body;
      if (i === 0) return coef < 0 ? `−${text}` : text;
      return coef < 0 ? ` − ${text}` : ` + ${text}`;
    })
    .join("");
}
