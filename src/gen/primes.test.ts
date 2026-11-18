import { describe, expect, it } from "vitest";
import type { Problem } from "../core/problem";
import { isPrime, smallestPrimeFactor } from "../math/primes";
import {
  DEFAULT_PRIMES,
  parsePrimesSettings,
  PRIMES_LIMITS,
  primes,
  validatePrimes,
  type PrimesSettings,
} from "./primes";

function problem(n: number, answer: string): Problem {
  return {
    skill: "primes.spf",
    prompt: `menor fator primo de ${n}`,
    answer,
    seed: 0,
    params: DEFAULT_PRIMES,
  };
}

/** The number in "menor fator primo de N". */
function numberOf(p: Problem): number {
  const m = /^menor fator primo de (\d+)$/.exec(p.prompt);
  expect(m, p.prompt).not.toBeNull();
  return Number(m?.[1]);
}

describe("check", () => {
  const composite = problem(91, "7");
  const prime = problem(97, "97");

  it.each(["7", " 7", "7 "])("check accepts the smallest factor of 91: %j", (input) => {
    expect(primes.check(composite, input)).toBe(true);
  });

  it("check accepts a prime as its own smallest factor", () => {
    expect(primes.check(prime, "97")).toBe(true);
  });

  it.each(["13", "1", "91", "-7", "−7", "7a", "", "07", "7.0"])(
    "check rejects a wrong answer for 91: %j",
    (input) => {
      expect(primes.check(composite, input)).toBe(false);
    },
  );

  it.each(["1", "9", "-97", "p"])("check rejects a wrong answer for 97: %j", (input) => {
    expect(primes.check(prime, input)).toBe(false);
  });
});

describe("generate", () => {
  it("generate asks for the smallest prime factor with a single skill", () => {
    for (let seed = 0; seed < 100; seed++) {
      const p = primes.generate(seed, DEFAULT_PRIMES);
      const n = numberOf(p);
      expect(p.skill).toBe("primes.spf");
      expect(p.answer).toBe(String(smallestPrimeFactor(n)));
      expect(p.seed).toBe(seed);
      expect(p.params).toEqual(DEFAULT_PRIMES);
      expect(p.choices).toBeUndefined();
    }
  });

  it("generate with limit 100 draws primes from 11 to 97 and only 49, 77 and 91 as composites", () => {
    const seen = new Set<number>();
    for (let seed = 0; seed < 2000; seed++) {
      const n = numberOf(primes.generate(seed, { limit: 100 }));
      expect(n).toBeGreaterThanOrEqual(11);
      expect(n).toBeLessThanOrEqual(100);
      if (!isPrime(n)) expect([49, 77, 91]).toContain(n);
      seen.add(n);
    }
    expect([...seen].filter((n) => !isPrime(n)).sort((a, b) => a - b)).toEqual([49, 77, 91]);
    expect([...seen].filter(isPrime).length).toBe(21);
  });

  it("generate rejects a limit outside the list", () => {
    expect(() => primes.generate(1, { limit: 50 } as unknown as PrimesSettings)).toThrow(
      RangeError,
    );
  });
});

describe("settings", () => {
  it("settings offer 100, 1000, 10^4 and 10^5 with 1000 by default", () => {
    expect(PRIMES_LIMITS).toEqual([100, 1000, 10_000, 100_000]);
    expect(DEFAULT_PRIMES).toEqual({ limit: 1000 });
    expect(validatePrimes(DEFAULT_PRIMES)).toEqual([]);
  });

  it("settings parse a listed limit and reject anything else", () => {
    expect(parsePrimesSettings({ limit: 10_000 })).toEqual({ limit: 10_000 });
    expect(parsePrimesSettings({ limit: 50 })).toBeNull();
    expect(parsePrimesSettings({ limit: "1000" })).toBeNull();
    expect(parsePrimesSettings({})).toBeNull();
    expect(parsePrimesSettings(null)).toBeNull();
    expect(parsePrimesSettings(7)).toBeNull();
  });
});
