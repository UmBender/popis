/** Largest seed; seeds are unsigned 32-bit integers. */
export const MAX_SEED = 0xffffffff;

/** Deterministic pseudo-random source. */
export interface Rng {
  /** Uniform float in [0, 1). */
  next(): number;
  /** Uniform integer in [lo, hi], both inclusive. */
  int(lo: number, hi: number): number;
  /** Uniform element of a non-empty list. */
  pick<T>(items: readonly T[]): T;
}

export function createRng(_seed: number): Rng {
  throw new Error("todo");
}

/** Seed of the `index`-th problem of a session seeded with `seed`. */
export function deriveSeed(_seed: number, _index: number): number {
  throw new Error("todo");
}

/** Fresh seed from the platform's entropy source. */
export function randomSeed(): number {
  throw new Error("todo");
}
