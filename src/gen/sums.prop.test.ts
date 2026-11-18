import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { MAX_SEED } from "../core/rng";
import { formatFraction, type Fraction } from "../math/fraction";
import { parse } from "../math/parse";
import { degree, evaluate } from "../math/poly";
import { SUMS_KINDS, skillOfKind, sums, type SumsKind } from "./sums";

const seed = fc.integer({ min: 0, max: MAX_SEED });
const kind = fc.constantFrom<SumsKind>(...SUMS_KINDS);
const CHECKED_N = Array.from({ length: 15 }, (_, i) => i + 1);

function closedForm(answer: string): Fraction {
  const r = parse(answer, { variables: { n: "x" } });
  if (r === null) throw new Error(`answer does not parse: ${answer}`);
  return r;
}

/** Value of the prompt's Σ for n, summed term by term. */
function sumOfPrompt(prompt: string, n: number): number {
  const match = /^Σᵢ₌(₁ⁿ|₀ⁿ⁻¹) (.+)$/.exec(prompt);
  if (match === null) throw new Error(`unexpected prompt: ${prompt}`);
  const f = parse(match[2] ?? "", { variables: { i: "x" } });
  if (f === null || f.denom !== 1) throw new Error(`unexpected summand: ${prompt}`);
  const [from, to] = match[1] === "₁ⁿ" ? [1, n] : [0, n - 1];
  let total = 0;
  for (let i = from; i <= to; i++) total += evaluate(f.poly, i);
  return total;
}

/** Runs the prompt's C++ loops and counts how many times ops++ runs. */
function opsOfPrompt(prompt: string, n: number): number {
  const FOR = /^\s*for \(int ([ijk]) = (0|1|[ij]|[ij] \+ 1); \1 < (n|[ij]); \1\+\+\)$/;
  const loops = prompt
    .split("\n")
    .slice(1, -1)
    .map((line) => {
      const m = FOR.exec(line);
      if (m === null) throw new Error(`unexpected loop: ${line}`);
      return { v: m[1] ?? "", start: m[2] ?? "", end: m[3] ?? "" };
    });
  const value = (expr: string, env: Readonly<Record<string, number>>): number => {
    if (expr === "n") return n;
    if (expr === "0" || expr === "1") return Number(expr);
    const v = env[expr.charAt(0)];
    if (v === undefined) throw new Error(`unbound ${expr}`);
    return expr.endsWith(" + 1") ? v + 1 : v;
  };
  const run = (depth: number, env: Readonly<Record<string, number>>): number => {
    const loop = loops[depth];
    if (loop === undefined) return 1;
    let ops = 0;
    for (let x = value(loop.start, env); x < value(loop.end, env); x++) {
      ops += run(depth + 1, { ...env, [loop.v]: x });
    }
    return ops;
  };
  return run(0, {});
}

describe("sums generator properties", () => {
  it("the canonical answer is accepted and the prompt itself is not", () => {
    fc.assert(
      fc.property(seed, kind, (s, k) => {
        const p = sums.generate(s, { kinds: [k] });
        expect(p.skill).toBe(skillOfKind(k));
        expect(sums.check(p, p.answer)).toBe(true);
        expect(sums.check(p, p.prompt)).toBe(false);
      }),
    );
  });

  it("the answer is the reduced closed form of a non-constant count", () => {
    fc.assert(
      fc.property(seed, kind, (s, k) => {
        const p = sums.generate(s, { kinds: [k] });
        const f = closedForm(p.answer);
        expect(formatFraction(f, { x: "n" })).toBe(p.answer);
        expect(degree(f.poly)).toBeGreaterThanOrEqual(1);
        expect(degree(f.poly)).toBeLessThanOrEqual(3);
      }),
    );
  });

  it("the answer counts what the prompt describes for n = 1 to 15", () => {
    fc.assert(
      fc.property(seed, kind, (s, k) => {
        const p = sums.generate(s, { kinds: [k] });
        const f = closedForm(p.answer);
        for (const n of CHECKED_N) {
          const count = k === "sum" ? sumOfPrompt(p.prompt, n) : opsOfPrompt(p.prompt, n);
          expect(evaluate(f.poly, n)).toBe(count * f.denom);
        }
      }),
    );
  });

  it("same seed and kinds give the same problem", () => {
    fc.assert(
      fc.property(seed, fc.subarray([...SUMS_KINDS], { minLength: 1 }), (s, kinds) => {
        expect(sums.generate(s, { kinds })).toEqual(sums.generate(s, { kinds }));
      }),
    );
  });
});
