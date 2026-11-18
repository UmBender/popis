import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { createRng, deriveSeed, MAX_SEED } from "./rng";

const seed = fc.integer({ min: 0, max: MAX_SEED });
const bounds = fc
  .tuple(fc.integer({ min: -1_000_000, max: 1_000_000 }), fc.integer({ min: 0, max: 1_000_000 }))
  .map(([lo, span]) => [lo, lo + span] as const);

describe("rng properties", () => {
  it("int always lands inside inclusive bounds", () => {
    fc.assert(
      fc.property(seed, bounds, (s, [lo, hi]) => {
        const rng = createRng(s);
        for (let i = 0; i < 10; i++) {
          const x = rng.int(lo, hi);
          expect(Number.isInteger(x)).toBe(true);
          expect(x).toBeGreaterThanOrEqual(lo);
          expect(x).toBeLessThanOrEqual(hi);
        }
      }),
    );
  });

  it("same seed replays the same ints", () => {
    fc.assert(
      fc.property(seed, bounds, (s, [lo, hi]) => {
        const a = createRng(s);
        const b = createRng(s);
        for (let i = 0; i < 10; i++) expect(a.int(lo, hi)).toBe(b.int(lo, hi));
      }),
    );
  });

  it("derived seeds are uint32", () => {
    fc.assert(
      fc.property(seed, fc.nat({ max: 100_000 }), (s, index) => {
        const d = deriveSeed(s, index);
        expect(Number.isInteger(d)).toBe(true);
        expect(d).toBeGreaterThanOrEqual(0);
        expect(d).toBeLessThanOrEqual(MAX_SEED);
      }),
    );
  });
});
