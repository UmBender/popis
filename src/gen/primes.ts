import type { Generator, Problem } from "../core/problem";

export type PrimesLimit = 100 | 1000 | 10_000 | 100_000;

export const PRIMES_LIMITS: readonly PrimesLimit[] = [100, 1000, 10_000, 100_000];

export type PrimesSettings = { readonly limit: PrimesLimit };

export const DEFAULT_PRIMES: PrimesSettings = { limit: 1000 };

/** The limit is picked from a list, so settings never block a start. */
export function validatePrimes(settings: PrimesSettings): string[] {
  void settings;
  throw new Error("todo");
}

/** Settings from untrusted JSON, or null when the limit is not in the list. */
export function parsePrimesSettings(value: unknown): PrimesSettings | null {
  void value;
  throw new Error("todo");
}

export const primes: Generator<PrimesSettings> = {
  id: "primes",

  generate(seed: number, params: PrimesSettings): Problem {
    void seed;
    void params;
    throw new Error("todo");
  },

  check(problem: Problem, input: string): boolean {
    void problem;
    void input;
    throw new Error("todo");
  },
};
