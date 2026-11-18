import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { Problem } from "../core/problem";
import { MAX_SEED } from "../core/rng";
import { estimation, ESTIMATION_KINDS, skillOfKind, type EstimationKind } from "./estimation";

const seed = fc.integer({ min: 0, max: MAX_SEED });
const kind = fc.constantFrom<EstimationKind>(...ESTIMATION_KINDS);

const SUPERSCRIPTS = "⁰¹²³⁴⁵⁶⁷⁸⁹";

function fromSuperscript(text: string): number {
  return Number([...text].map((c) => SUPERSCRIPTS.indexOf(c)).join(""));
}

/** "5000", "10¹⁸" or "2·10⁵" as a number. */
function readNumber(text: string): number {
  if (/^\d+$/.test(text)) return Number(text);
  const m = /^(?:(\d)·)?10([⁰-⁹]+)$/.exec(text);
  expect(m, text).not.toBeNull();
  return Number(m?.[1] ?? 1) * 10 ** fromSuperscript(m?.[2] ?? "");
}

function factorial(n: number): number {
  let f = 1;
  for (let i = 2; i <= Math.min(n, 200); i++) f *= i;
  return f;
}

/** Operations of each complexity class for input size n (log base 2). */
const OPS: Readonly<Record<string, (n: number) => number>> = {
  "O(n!)": factorial,
  "O(2ⁿ·n)": (n) => 2 ** n * n,
  "O(n³)": (n) => n ** 3,
  "O(n²)": (n) => n ** 2,
  "O(n√n)": (n) => n * Math.sqrt(n),
  "O(n log n)": (n) => n * Math.log2(n),
  "O(n)": (n) => n,
  "O(√n)": (n) => Math.sqrt(n),
  "O(log n)": (n) => Math.log2(n),
};
const SCALE = Object.keys(OPS);

/** log₁₀ of each magnitude function at n. */
const LOG10: Readonly<Record<string, (n: number) => number>> = {
  "n log n": (n) => Math.log10(n) + Math.log10(Math.log2(n)),
  "n√n": (n) => 1.5 * Math.log10(n),
  "n²": (n) => 2 * Math.log10(n),
  "n³": (n) => 3 * Math.log10(n),
  "2ⁿ": (n) => n * Math.log10(2),
  "n!": (n) => {
    let sum = 0;
    for (let i = 2; i <= n; i++) sum += Math.log10(i);
    return sum;
  },
};

function correct(p: Problem): string {
  const text = p.choices?.[Number(p.answer) - 1];
  expect(text, p.prompt).toBeDefined();
  return text ?? "";
}

function bigFactorial(n: bigint): bigint {
  let f = 1n;
  for (let i = 2n; i <= n; i++) f *= i;
  return f;
}

/** The value an overflow prompt asks about. */
function overflowValue(prompt: string): bigint {
  const body = prompt.replace(/ cabe em qual tipo\?$/, "");
  let m = /^(\d+) × (\d+)$/.exec(body);
  if (m !== null) return BigInt(m[1] ?? "") * BigInt(m[2] ?? "");
  m = /^(\d+)!$/.exec(body);
  if (m !== null) return bigFactorial(BigInt(m[1] ?? ""));
  m = /^2([⁰-⁹]+)$/.exec(body);
  if (m !== null) return 2n ** BigInt(fromSuperscript(m[1] ?? ""));
  m = /^n\(n \+ 1\)\/2 com n = (\d+)$/.exec(body);
  if (m !== null) {
    const n = BigInt(m[1] ?? "");
    return (n * (n + 1n)) / 2n;
  }
  throw new Error(`unexpected overflow prompt: ${prompt}`);
}

const FITS: Readonly<Record<string, (v: bigint) => boolean>> = {
  int32: (v) => v <= 2n ** 31n - 1n,
  int64: (v) => v <= 2n ** 63n - 1n,
  nenhum: () => true,
};

describe("estimation generator properties", () => {
  it("the canonical answer is an option number and is accepted", () => {
    fc.assert(
      fc.property(seed, kind, (s, k) => {
        const p = estimation.generate(s, { kinds: [k] });
        expect(p.skill).toBe(skillOfKind(k));
        const n = Number(p.answer);
        expect(Number.isInteger(n)).toBe(true);
        expect(n).toBeGreaterThanOrEqual(1);
        expect(n).toBeLessThanOrEqual(p.choices?.length ?? 0);
        expect(estimation.check(p, p.answer)).toBe(true);
      }),
    );
  });

  it("complexity answers fit 2·10⁸ operations, the next class needs 10⁹ and others are wrong", () => {
    fc.assert(
      fc.property(seed, (s) => {
        const p = estimation.generate(s, { kinds: ["complexity"] });
        const m = /^n ≤ (\S+), 1 s: maior complexidade viável\?$/.exec(p.prompt);
        expect(m, p.prompt).not.toBeNull();
        const n = readNumber(m?.[1] ?? "");
        expect(n).toBeGreaterThanOrEqual(8);
        const answer = correct(p);
        const ops = (c: string) => (OPS[c] ?? (() => NaN))(n);
        const i = SCALE.indexOf(answer);
        expect(i).toBeGreaterThanOrEqual(0);
        expect(ops(answer)).toBeLessThanOrEqual(2e8);
        if (i > 0) expect(ops(SCALE[i - 1] ?? "")).toBeGreaterThanOrEqual(1e9);
        for (const option of p.choices ?? []) {
          if (option === answer) continue;
          // Costlier classes do not fit; cheaper ones fit but are not the largest.
          if (SCALE.indexOf(option) < i) expect(ops(option)).toBeGreaterThanOrEqual(1e9);
          else expect(ops(option)).toBeLessThanOrEqual(ops(answer));
        }
      }),
    );
  });

  it("magnitude answers are the nearest power of ten, away from the midpoint", () => {
    fc.assert(
      fc.property(seed, (s) => {
        const p = estimation.generate(s, { kinds: ["magnitude"] });
        const m = /^O\((.+)\) com n = (\S+): quantas operações\?$/.exec(p.prompt);
        expect(m, p.prompt).not.toBeNull();
        const log = LOG10[m?.[1] ?? ""];
        expect(log, p.prompt).toBeDefined();
        const value = (log ?? (() => NaN))(readNumber(m?.[2] ?? ""));
        const exponents = (p.choices ?? []).map((c) => {
          const e = /^10([⁰-⁹]+)$/.exec(c);
          expect(e, c).not.toBeNull();
          return fromSuperscript(e?.[1] ?? "");
        });
        expect(exponents).toHaveLength(4);
        exponents.forEach((e, j) => {
          expect(e).toBe((exponents[0] ?? 0) + j);
        });
        const answer = exponents[Number(p.answer) - 1] ?? NaN;
        expect(answer).toBe(Math.round(value));
        const fraction = value - Math.floor(value);
        expect(Math.abs(fraction - 0.5)).toBeGreaterThan(0.15);
        for (const e of exponents) {
          if (e !== answer) expect(Math.abs(value - e)).toBeGreaterThan(0.5);
        }
      }),
    );
  });

  it("overflow answers are the smallest signed type that holds the value", () => {
    fc.assert(
      fc.property(seed, (s) => {
        const p = estimation.generate(s, { kinds: ["overflow"] });
        const value = overflowValue(p.prompt);
        const options = p.choices ?? [];
        expect(options).toEqual(["int32", "int64", "nenhum"]);
        const first = options.findIndex((o) => (FITS[o] ?? (() => false))(value));
        expect(Number(p.answer)).toBe(first + 1);
      }),
    );
  });

  it("same seed and kinds give the same problem", () => {
    fc.assert(
      fc.property(seed, fc.subarray([...ESTIMATION_KINDS], { minLength: 1 }), (s, kinds) => {
        expect(estimation.generate(s, { kinds })).toEqual(estimation.generate(s, { kinds }));
      }),
    );
  });
});
