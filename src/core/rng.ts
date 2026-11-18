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

/** Mulberry32: tiny, fast and good enough for drills. */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int(lo, hi) {
      if (!Number.isSafeInteger(lo) || !Number.isSafeInteger(hi) || lo > hi) {
        throw new RangeError(`invalid integer range [${lo}, ${hi}]`);
      }
      return lo + Math.floor(next() * (hi - lo + 1));
    },
    pick<T>(items: readonly T[]): T {
      if (items.length === 0) throw new RangeError("cannot pick from an empty list");
      return items[Math.floor(next() * items.length)] as T;
    },
  };
}

/**
 * Seed of the `index`-th problem of a session seeded with `seed`.
 * Distinct indices give distinct seeds: an odd multiplier and the murmur3
 * finalizer are both bijections on 32-bit integers.
 */
export function deriveSeed(seed: number, index: number): number {
  let h = (seed ^ Math.imul(index + 1, 0x9e3779b9)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

/** Fresh seed from the platform's entropy source. */
export function randomSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
}
