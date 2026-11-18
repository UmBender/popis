import type { Generator, Problem } from "../core/problem";
import { createRng, retry } from "../core/rng";
import { isPrime, smallestPrimeFactor } from "../math/primes";

export type PrimesLimit = 100 | 1000 | 10_000 | 100_000;

export const PRIMES_LIMITS: readonly PrimesLimit[] = [100, 1000, 10_000, 100_000];

export type PrimesSettings = { readonly limit: PrimesLimit };

export const DEFAULT_PRIMES: PrimesSettings = { limit: 1000 };

/** Smallest number asked; below it every prime is too easy. */
const MIN_NUMBER = 11;
/** A composite's smallest prime factor is at least this: no 2, 3 or 5. */
const MIN_FACTOR = 7;

/** The limit is picked from a list, so settings never block a start. */
export const validatePrimes: (settings: PrimesSettings) => readonly string[] = () => [];

/** Settings from untrusted JSON, or null when the limit is not in the list. */
export function parsePrimesSettings(value: unknown): PrimesSettings | null {
  if (typeof value !== "object" || value === null) return null;
  const limit: unknown = (value as { limit?: unknown }).limit;
  return PRIMES_LIMITS.includes(limit as PrimesLimit) ? { limit: limit as PrimesLimit } : null;
}

export const primes: Generator<PrimesSettings> = {
  id: "primes",

  /** Half primes, half composites with no factor below 7; both uniform by rejection. */
  generate(seed: number, params: PrimesSettings): Problem {
    if (!PRIMES_LIMITS.includes(params.limit)) {
      throw new RangeError(`invalid primes limit: ${String(params.limit)}`);
    }
    const rng = createRng(seed);
    const wantPrime = rng.next() < 0.5;
    const n = retry(
      () => rng.int(MIN_NUMBER, params.limit),
      (n) => (wantPrime ? isPrime(n) : !isPrime(n) && smallestPrimeFactor(n) >= MIN_FACTOR),
    );
    return {
      skill: "primes.spf",
      prompt: `menor fator primo de ${n}`,
      answer: String(smallestPrimeFactor(n)),
      seed,
      params,
    };
  },

  check(problem: Problem, input: string): boolean {
    return input.trim() === problem.answer;
  },
};
