import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { formatFraction, fraction, sameValue } from "./fraction";
import { parse } from "./parse";
import { add, constant, equals, monomial, mul, type Poly } from "./poly";

/** Small random polynomials in x. */
const poly: fc.Arbitrary<Poly> = fc
  .array(fc.record({ coef: fc.integer({ min: -9, max: 9 }), ex: fc.integer({ min: 0, max: 3 }) }), {
    maxLength: 4,
  })
  .map((ts) => ts.reduce<Poly>((p, t) => add(p, monomial(t.coef, t.ex, 0)), constant(0)));
const denom = fc.integer({ min: 1, max: 24 });
const scale = fc.integer({ min: 1, max: 12 });

describe("fraction properties", () => {
  it("parse(formatFraction(f)) is f, with x or with n", () => {
    fc.assert(
      fc.property(poly, denom, (p, d) => {
        const f = fraction(p, d);
        for (const names of [undefined, { x: "n" }] as const) {
          const r = parse(
            formatFraction(f, names),
            names === undefined ? undefined : { variables: { n: "x" } },
          );
          expect(r).not.toBeNull();
          expect(equals(r?.poly ?? constant(0), f.poly)).toBe(true);
          expect(r?.denom).toBe(f.denom);
        }
      }),
    );
  });

  it("scaling the numerator and the denominator keeps the value", () => {
    fc.assert(
      fc.property(poly, denom, scale, (p, d, k) => {
        const scaled = { poly: mul(constant(k), p), denom: k * d };
        expect(sameValue(fraction(p, d), scaled)).toBe(true);
        expect(sameValue(fraction(p, d), fraction(mul(constant(k), p), k * d))).toBe(true);
      }),
    );
  });

  it("different numerators over the same denominator differ", () => {
    fc.assert(
      fc.property(poly, poly, denom, (p, q, d) => {
        expect(sameValue(fraction(p, d), fraction(q, d))).toBe(equals(p, q));
      }),
    );
  });
});
