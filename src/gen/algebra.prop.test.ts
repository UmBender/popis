import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { MAX_SEED } from "../core/rng";
import { parse } from "../math/parse";
import { degree, equals, mul, type Poly } from "../math/poly";
import { ALGEBRA_KINDS, algebra, skillOfKind, type AlgebraKind } from "./algebra";

const seed = fc.integer({ min: 0, max: MAX_SEED });
const kind = fc.constantFrom<AlgebraKind>(...ALGEBRA_KINDS);

function poly(text: string): Poly {
  const r = parse(text);
  if (r === null) throw new Error(`does not parse: ${text}`);
  return r.poly;
}

describe("algebra generator properties", () => {
  it("the canonical answer is accepted and the prompt itself is not", () => {
    fc.assert(
      fc.property(seed, kind, (s, k) => {
        const p = algebra.generate(s, { kinds: [k] });
        expect(p.skill).toBe(skillOfKind(k));
        expect(algebra.check(p, p.answer)).toBe(true);
        const body = p.prompt.slice(p.prompt.indexOf(": ") + 2);
        expect(algebra.check(p, body)).toBe(false);
      }),
    );
  });

  it("the answer has the value of the prompt", () => {
    fc.assert(
      fc.property(seed, kind, (s, k) => {
        const p = algebra.generate(s, { kinds: [k] });
        const body = p.prompt.slice(p.prompt.indexOf(": ") + 2);
        if (k === "divide") {
          const [dividend, divisor] = body.split(" ÷ ");
          expect(equals(mul(poly(p.answer), poly(divisor ?? "")), poly(dividend ?? ""))).toBe(true);
          expect(degree(poly(dividend ?? ""))).toBe(3);
        } else {
          expect(equals(poly(p.answer), poly(body))).toBe(true);
          expect(degree(poly(p.answer))).toBeGreaterThanOrEqual(1);
        }
      }),
    );
  });

  it("same seed and kinds give the same problem", () => {
    fc.assert(
      fc.property(seed, fc.subarray([...ALGEBRA_KINDS], { minLength: 1 }), (s, kinds) => {
        expect(algebra.generate(s, { kinds })).toEqual(algebra.generate(s, { kinds }));
      }),
    );
  });
});
