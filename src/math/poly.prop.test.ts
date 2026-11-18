import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { parse } from "./parse";
import { add, constant, equals, format, monomial, mul, type Poly } from "./poly";

/** Small random polynomials in x and y. */
const poly: fc.Arbitrary<Poly> = fc
  .array(
    fc.record({
      coef: fc.integer({ min: -9, max: 9 }),
      ex: fc.integer({ min: 0, max: 3 }),
      ey: fc.integer({ min: 0, max: 2 }),
    }),
    { maxLength: 5 },
  )
  .map((ts) => ts.reduce<Poly>((p, t) => add(p, monomial(t.coef, t.ex, t.ey)), constant(0)));

describe("polynomial ring properties", () => {
  it("addition is commutative and associative", () => {
    fc.assert(
      fc.property(poly, poly, poly, (p, q, r) => {
        expect(equals(add(p, q), add(q, p))).toBe(true);
        expect(equals(add(add(p, q), r), add(p, add(q, r)))).toBe(true);
      }),
    );
  });

  it("multiplication is commutative and associative", () => {
    fc.assert(
      fc.property(poly, poly, poly, (p, q, r) => {
        expect(equals(mul(p, q), mul(q, p))).toBe(true);
        expect(equals(mul(mul(p, q), r), mul(p, mul(q, r)))).toBe(true);
      }),
    );
  });

  it("multiplication distributes over addition", () => {
    fc.assert(
      fc.property(poly, poly, poly, (p, q, r) => {
        expect(equals(mul(p, add(q, r)), add(mul(p, q), mul(p, r)))).toBe(true);
      }),
    );
  });

  it("parse(format(p)) gives p back", () => {
    fc.assert(
      fc.property(poly, (p) => {
        const parsed = parse(format(p));
        expect(parsed).not.toBeNull();
        expect(equals(parsed?.poly ?? constant(0), p)).toBe(true);
      }),
    );
  });
});
