import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { MAX_SEED } from "../core/rng";
import {
  arithmetic,
  validateArithmetic,
  type ArithmeticSettings,
  type Operation,
} from "./arithmetic";

const seed = fc.integer({ min: 0, max: MAX_SEED });

function range(minLow: number) {
  return fc
    .tuple(fc.integer({ min: minLow, max: 1000 }), fc.integer({ min: 0, max: 1000 }))
    .map(([min, span]) => ({ min, max: min + span }));
}

/** Any valid settings: at least one operation, divisor range without zero. */
const settings: fc.Arbitrary<ArithmeticSettings> = fc
  .record({
    operations: fc.subarray<Operation>(["add", "sub", "mul", "div"], { minLength: 1 }),
    addLeft: range(0),
    addRight: range(0),
    mulLeft: range(1),
    mulRight: range(0),
  })
  .filter((s) => validateArithmetic(s).length === 0);

function within(x: number, r: { min: number; max: number }): boolean {
  return Number.isInteger(x) && x >= r.min && x <= r.max;
}

describe("arithmetic generator properties", () => {
  it("the canonical answer is always accepted", () => {
    fc.assert(
      fc.property(seed, settings, (s, params) => {
        const p = arithmetic.generate(s, params);
        expect(arithmetic.check(p, p.answer)).toBe(true);
      }),
    );
  });

  it("operands respect the ranges and the answer is exact", () => {
    fc.assert(
      fc.property(seed, settings, (s, params) => {
        const p = arithmetic.generate(s, params);
        const match = /^(\d+) ([+−×÷]) (\d+)$/.exec(p.prompt);
        expect(match).not.toBeNull();
        const x = Number(match?.[1]);
        const y = Number(match?.[3]);
        const answer = Number(p.answer);
        switch (match?.[2]) {
          case "+":
            expect(params.operations).toContain("add");
            expect(within(x, params.addLeft) && within(y, params.addRight)).toBe(true);
            expect(answer).toBe(x + y);
            break;
          case "−":
            expect(params.operations).toContain("sub");
            expect(within(y, params.addLeft) && within(answer, params.addRight)).toBe(true);
            expect(x).toBe(y + answer);
            break;
          case "×":
            expect(params.operations).toContain("mul");
            expect(within(x, params.mulLeft) && within(y, params.mulRight)).toBe(true);
            expect(answer).toBe(x * y);
            break;
          case "÷":
            expect(params.operations).toContain("div");
            expect(within(y, params.mulLeft) && within(answer, params.mulRight)).toBe(true);
            expect(x).toBe(y * answer);
            break;
          default:
            throw new Error(`unexpected prompt: ${p.prompt}`);
        }
      }),
    );
  });

  it("same seed and params give the same problem", () => {
    fc.assert(
      fc.property(seed, settings, (s, params) => {
        expect(arithmetic.generate(s, params)).toEqual(arithmetic.generate(s, params));
      }),
    );
  });
});
