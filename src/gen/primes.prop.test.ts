import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { MAX_SEED } from "../core/rng";
import { isPrime, smallestPrimeFactor } from "../math/primes";
import { PRIMES_LIMITS, primes, type PrimesLimit } from "./primes";

const seed = fc.integer({ min: 0, max: MAX_SEED });
const limit = fc.constantFrom<PrimesLimit>(...PRIMES_LIMITS);

function numberOf(prompt: string): number {
  const m = /^menor fator primo de (\d+)$/.exec(prompt);
  expect(m, prompt).not.toBeNull();
  return Number(m?.[1]);
}

describe("primes generator properties", () => {
  it("the canonical answer is accepted and is the smallest prime factor", () => {
    fc.assert(
      fc.property(seed, limit, (s, l) => {
        const p = primes.generate(s, { limit: l });
        const n = numberOf(p.prompt);
        expect(p.answer).toBe(String(smallestPrimeFactor(n)));
        expect(primes.check(p, p.answer)).toBe(true);
      }),
    );
  });

  it("the number is in [11, limit] and a composite has no factor below 7", () => {
    fc.assert(
      fc.property(seed, limit, (s, l) => {
        const n = numberOf(primes.generate(s, { limit: l }).prompt);
        expect(n).toBeGreaterThanOrEqual(11);
        expect(n).toBeLessThanOrEqual(l);
        expect(smallestPrimeFactor(n)).toBeGreaterThanOrEqual(7);
      }),
    );
  });

  it("same seed and limit give the same problem", () => {
    fc.assert(
      fc.property(seed, limit, (s, l) => {
        expect(primes.generate(s, { limit: l })).toEqual(primes.generate(s, { limit: l }));
      }),
    );
  });

  it.each(PRIMES_LIMITS)("about half of the numbers are prime with limit %i", (l) => {
    const SEEDS = 2000;
    let count = 0;
    for (let s = 0; s < SEEDS; s++) {
      if (isPrime(numberOf(primes.generate(s, { limit: l }).prompt))) count++;
    }
    expect(count / SEEDS).toBeGreaterThanOrEqual(0.4);
    expect(count / SEEDS).toBeLessThanOrEqual(0.6);
  });
});
