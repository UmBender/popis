import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { MAX_SEED } from "../core/rng";
import { parse } from "../math/parse";
import { degree, equals, terms, type Poly } from "../math/poly";
import { factoring, LEVELS, skillOfLevel, type Level } from "./factoring";

const seed = fc.integer({ min: 0, max: MAX_SEED });
const level = fc.constantFrom<Level>(...LEVELS);

function parsed(text: string): { poly: Poly; factors: number } {
  const r = parse(text);
  if (r === null) throw new Error(`does not parse: ${text}`);
  return r;
}

function gcd(a: number, b: number): number {
  return b === 0 ? Math.abs(a) : gcd(b, a % b);
}

/** Leading coefficient (highest power of x) and content of a polynomial. */
function shape(p: Poly) {
  const ts = terms(p);
  return {
    lead: ts[0]?.coef ?? 0,
    content: ts.reduce((g, t) => gcd(g, t.coef), 0),
    hasY: ts.some((t) => t.ey > 0),
    homogeneous: ts.every((t) => t.ex + t.ey === degree(p)),
  };
}

describe("factoring generator properties", () => {
  it("the canonical answer is always accepted", () => {
    fc.assert(
      fc.property(seed, level, (s, l) => {
        const p = factoring.generate(s, { levels: [l] });
        expect(factoring.check(p, p.answer)).toBe(true);
      }),
    );
  });

  it("prompt is the expansion of the answer, and is not factored", () => {
    fc.assert(
      fc.property(seed, level, (s, l) => {
        const p = factoring.generate(s, { levels: [l] });
        const prompt = parsed(p.prompt);
        expect(equals(prompt.poly, parsed(p.answer).poly)).toBe(true);
        expect(prompt.factors).toBe(1);
        expect(factoring.check(p, p.prompt)).toBe(false);
      }),
    );
  });

  it("each level respects its shape", () => {
    fc.assert(
      fc.property(seed, level, (s, l) => {
        const p = factoring.generate(s, { levels: [l] });
        const target = parsed(p.answer);
        const { lead, content, hasY, homogeneous } = shape(target.poly);
        const d = degree(target.poly);
        expect(p.skill).toBe(skillOfLevel(l));
        expect(hasY).toBe(l === 6);
        switch (l) {
          case 1:
            expect([d, lead, target.factors]).toEqual([2, 1, 2]);
            break;
          case 2:
            expect([d, target.factors, content]).toEqual([2, 2, 1]);
            expect(lead).toBeGreaterThan(1);
            break;
          case 3:
            expect(content).toBeGreaterThanOrEqual(2);
            expect([2, 3]).toContain(target.factors);
            break;
          case 4:
            expect([2, 3]).toContain(d);
            expect([target.factors, content]).toEqual([2, 1]);
            break;
          case 5:
            expect([d, lead, target.factors]).toEqual([3, 1, 3]);
            break;
          case 6:
            expect([d, lead, target.factors, homogeneous]).toEqual([2, 1, 2, true]);
            break;
        }
      }),
    );
  });

  it("same seed and levels give the same problem", () => {
    fc.assert(
      fc.property(seed, fc.subarray([...LEVELS], { minLength: 1 }), (s, levels) => {
        expect(factoring.generate(s, { levels })).toEqual(factoring.generate(s, { levels }));
      }),
    );
  });
});
