import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { MAX_SEED } from "../core/rng";
import { division, DIVISION_KINDS, skillOfKind, type DivisionKind } from "./division";

const seed = fc.integer({ min: 0, max: MAX_SEED });
const kind = fc.constantFrom<DivisionKind>(...DIVISION_KINDS);

function num(text: string | undefined): number {
  return Number((text ?? "").replace("−", "-"));
}

/** Operands of "C++: a / b", "⌊a / b⌋", "a mod b"…; null for inequalities. */
function operands(prompt: string): [number, number] | null {
  const m = /(−?\d+) (?:\/|%|mod) (−?\d+)/.exec(prompt);
  return m === null ? null : [num(m[1]), num(m[2])];
}

describe("division generator properties", () => {
  it("the canonical answer is accepted and is an integer", () => {
    fc.assert(
      fc.property(seed, kind, (s, k) => {
        const p = division.generate(s, { kinds: [k] });
        expect(p.skill).toBe(skillOfKind(k));
        expect(Number.isInteger(Number(p.answer))).toBe(true);
        expect(division.check(p, p.answer)).toBe(true);
      }),
    );
  });

  it("each answer satisfies the definition of its kind", () => {
    fc.assert(
      fc.property(seed, kind, (s, k) => {
        const p = division.generate(s, { kinds: [k] });
        const x = Number(p.answer);
        if (k === "inequality") {
          const m = /^(maior|menor) x inteiro: (.+) ([≤≥]) (−?\d+)$/.exec(p.prompt);
          expect(m).not.toBeNull();
          const [, want, lhs, rel, rhs] = m ?? [];
          const lin = /^(−?\d*)x(?: ([+−]) (\d+))?$/.exec(lhs ?? "");
          expect(lin).not.toBeNull();
          const coef = lin?.[1] === "" ? 1 : lin?.[1] === "−" ? -1 : num(lin?.[1]);
          const constant = lin?.[3] === undefined ? 0 : num(lin[3]) * (lin[2] === "−" ? -1 : 1);
          const holds = (v: number) =>
            rel === "≤" ? coef * v + constant <= num(rhs) : coef * v + constant >= num(rhs);
          expect(holds(x)).toBe(true);
          expect(holds(want === "maior" ? x + 1 : x - 1)).toBe(false);
          return;
        }
        const ops = operands(p.prompt);
        expect(ops).not.toBeNull();
        const [a, b] = ops ?? [0, 1];
        expect(Math.abs(b)).toBeGreaterThanOrEqual(2);
        expect(Math.abs(b)).toBeLessThanOrEqual(12);
        expect(a < 0 || b < 0).toBe(true);
        switch (k) {
          case "cpp-div": {
            const r = a - b * x;
            expect(Math.abs(r)).toBeLessThan(Math.abs(b));
            expect(r === 0 || Math.sign(r) === Math.sign(a)).toBe(true);
            break;
          }
          case "cpp-mod":
            expect(Number.isInteger((a - x) / b)).toBe(true);
            expect(Math.abs(x)).toBeLessThan(Math.abs(b));
            expect(x === 0 || Math.sign(x) === Math.sign(a)).toBe(true);
            break;
          case "floor":
            expect(a % b).not.toBe(0);
            expect(x <= a / b && a / b < x + 1).toBe(true);
            break;
          case "ceil":
            expect(a % b).not.toBe(0);
            expect(x - 1 < a / b && a / b <= x).toBe(true);
            break;
          case "mod":
            expect(b).toBeGreaterThan(0);
            expect(x >= 0 && x < b).toBe(true);
            expect(Number.isInteger((a - x) / b)).toBe(true);
            break;
        }
      }),
    );
  });

  it("same seed and kinds give the same problem", () => {
    fc.assert(
      fc.property(seed, fc.subarray([...DIVISION_KINDS], { minLength: 1 }), (s, kinds) => {
        expect(division.generate(s, { kinds })).toEqual(division.generate(s, { kinds }));
      }),
    );
  });
});
