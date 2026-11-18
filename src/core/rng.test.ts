import { describe, expect, it } from "vitest";
import { createRng, deriveSeed, MAX_SEED, randomSeed, retry } from "./rng";

describe("createRng", () => {
  it("same seed gives the same sequence", () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it("different seeds give different sequences", () => {
    const a = createRng(1);
    const b = createRng(2);
    expect(Array.from({ length: 5 }, () => a.next())).not.toEqual(
      Array.from({ length: 5 }, () => b.next()),
    );
  });

  it("next stays in [0, 1)", () => {
    const rng = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const x = rng.next();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });

  it("int covers both bounds of a small range", () => {
    const rng = createRng(3);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) seen.add(rng.int(2, 4));
    expect([...seen].sort()).toEqual([2, 3, 4]);
  });

  it("int with equal bounds returns that bound", () => {
    expect(createRng(9).int(5, 5)).toBe(5);
  });

  it("pick returns an element of the list", () => {
    const rng = createRng(11);
    const items = ["a", "b", "c"] as const;
    for (let i = 0; i < 50; i++) expect(items).toContain(rng.pick(items));
  });

  it("pick on an empty list throws", () => {
    expect(() => createRng(1).pick([])).toThrow();
  });

  it("int with inverted or fractional bounds throws", () => {
    expect(() => createRng(1).int(5, 4)).toThrow(RangeError);
    expect(() => createRng(1).int(0.5, 4)).toThrow(RangeError);
  });
});

describe("randomSeed", () => {
  it("returns a uint32", () => {
    for (let i = 0; i < 20; i++) {
      const s = randomSeed();
      expect(Number.isInteger(s)).toBe(true);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(MAX_SEED);
    }
  });
});

describe("deriveSeed", () => {
  it("is deterministic", () => {
    expect(deriveSeed(123, 4)).toBe(deriveSeed(123, 4));
  });

  it("gives different seeds for consecutive indices", () => {
    const seeds = new Set(Array.from({ length: 100 }, (_, i) => deriveSeed(99, i)));
    expect(seeds.size).toBe(100);
  });

  it("stays a uint32", () => {
    for (let i = 0; i < 100; i++) {
      const s = deriveSeed(MAX_SEED, i);
      expect(Number.isInteger(s)).toBe(true);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(MAX_SEED);
    }
  });
});

describe("retry", () => {
  it("returns the first accepted value", () => {
    let n = 0;
    expect(
      retry(
        () => ++n,
        (v) => v >= 3,
      ),
    ).toBe(3);
  });

  it("throws when no value is accepted within the attempts", () => {
    expect(() =>
      retry(
        () => 1,
        () => false,
        5,
      ),
    ).toThrow(/5 attempts/);
  });
});
