import { describe, expect, it } from "vitest";
import { isPrime, smallestPrimeFactor } from "./primes";

const LIMIT = 100_000;

/** Smallest prime factor of every n ≤ limit, by the sieve of Eratosthenes. */
function sieve(limit: number): number[] {
  const spf = new Array<number>(limit + 1).fill(0);
  for (let p = 2; p <= limit; p++) {
    if (spf[p] !== 0) continue;
    for (let m = p; m <= limit; m += p) if (spf[m] === 0) spf[m] = p;
  }
  return spf;
}

describe("primes", () => {
  it.each([
    [2, 2],
    [3, 3],
    [4, 2],
    [9, 3],
    [25, 5],
    [49, 7],
    [91, 7],
    [97, 97],
    [221, 13],
    [99_991, 99_991],
    [100_000, 2],
  ])("smallestPrimeFactor of %i is %i", (n, p) => {
    expect(smallestPrimeFactor(n)).toBe(p);
  });

  it.each([1, 0, -7, 2.5, NaN, Infinity])("smallestPrimeFactor rejects %s", (n) => {
    expect(() => smallestPrimeFactor(n)).toThrow(RangeError);
  });

  it.each([
    [2, true],
    [11, true],
    [1, false],
    [0, false],
    [-3, false],
    [91, false],
    [2.5, false],
  ])("isPrime of %s is %s", (n, prime) => {
    expect(isPrime(n)).toBe(prime);
  });

  it("smallestPrimeFactor and isPrime agree with a sieve up to 10^5", () => {
    const spf = sieve(LIMIT);
    for (let n = 2; n <= LIMIT; n++) {
      expect(smallestPrimeFactor(n)).toBe(spf[n]);
      expect(isPrime(n)).toBe(spf[n] === n);
    }
  });
});
