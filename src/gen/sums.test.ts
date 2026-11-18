import { describe, expect, it } from "vitest";
import type { Problem } from "../core/problem";
import { formatFraction } from "../math/fraction";
import { closedForm, DEFAULT_SUMS, skillOfKind, SUMS_KINDS, sums, type SumsKind } from "./sums";

const N = { x: "n" } as const;

function problem(kind: SumsKind, prompt: string, answer: string): Problem {
  return { skill: skillOfKind(kind), prompt, answer, seed: 0, params: DEFAULT_SUMS };
}

function closed(count: (n: number) => number): string | null {
  const f = closedForm(count);
  return f === null ? null : formatFraction(f, N);
}

const SEEDS = Array.from({ length: 200 }, (_, i) => i);

describe("closedForm", () => {
  it("closedForm interpolates polynomial counts and reduces the fraction", () => {
    expect(closed((n) => (n * (n + 1)) / 2)).toBe("(n² + n)/2");
    expect(closed((n) => (n * (n + 1) * (2 * n + 1)) / 6)).toBe("(2n³ + 3n² + n)/6");
    expect(closed((n) => n - 1)).toBe("n − 1");
    expect(closed((n) => (n * n * (n + 1) * (n + 1)) / 4)).toBe("(n⁴ + 2n³ + n²)/4");
    expect(closed(() => 7)).toBe("7");
  });

  it("closedForm returns null when the count is not polynomial on the extra points", () => {
    expect(closed((n) => 2 ** n)).toBeNull();
    expect(closed((n) => Math.max(0, n - 3))).toBeNull();
    expect(closed((n) => n ** 5)).toBeNull();
  });
});

describe("sum prompt", () => {
  it("sum prompt is Σ from i = 1 to n or from i = 0 to n − 1 of a polynomial in i", () => {
    const starts = new Set<string>();
    for (const seed of SEEDS) {
      const p = sums.generate(seed, { kinds: ["sum"] });
      const match = /^Σᵢ₌(₁ⁿ|₀ⁿ⁻¹) (.+)$/.exec(p.prompt);
      expect(match, p.prompt).not.toBeNull();
      starts.add(match?.[1] ?? "");
      expect(match?.[2]).toMatch(/^(\([^()]+\)|[^()\s]+)$/);
      expect(match?.[2]).toMatch(/i/);
      expect(p.skill).toBe("sums.sum");
    }
    expect(starts).toEqual(new Set(["₁ⁿ", "₀ⁿ⁻¹"]));
  });
});

describe("loop prompt", () => {
  const FOR = /^for \(int ([ijk]) = (0|1|[ij]|[ij] \+ 1); \1 < (n|[ij]); \1\+\+\)$/;

  it("loop prompt is a comment, 1 to 3 nested C++ for loops and ops++", () => {
    const depths = new Set<number>();
    for (const seed of SEEDS) {
      const p = sums.generate(seed, { kinds: ["loop"] });
      const lines = p.prompt.split("\n");
      expect(lines[0]).toBe("// quantas vezes ops++ roda?");
      const loops = lines.slice(1, -1);
      depths.add(loops.length);
      loops.forEach((line, depth) => {
        expect(line.startsWith("  ".repeat(depth))).toBe(true);
        expect(line.trimStart(), line).toMatch(FOR);
        expect(line.trimStart().slice(9, 10)).toBe("ijk"[depth]);
      });
      expect(lines.at(-1)).toBe(`${"  ".repeat(loops.length)}ops++;`);
      expect(p.skill).toBe("sums.loop");
    }
    expect(depths).toEqual(new Set([1, 2, 3]));
  });

  it("the outer loop never starts from or stops at another variable", () => {
    for (const seed of SEEDS) {
      const outer = sums.generate(seed, { kinds: ["loop"] }).prompt.split("\n")[1] ?? "";
      expect(outer).toMatch(/^for \(int i = [01]; i < n; i\+\+\)$/);
    }
  });
});

describe("checker", () => {
  const p = problem("sum", "Σᵢ₌₁ⁿ i", "(n² + n)/2");

  it.each(["(n² + n)/2", "n(n+1)/2", "n²/2 + n/2", "(n+1)n/2", "n(n+1) ÷ 2", "(n^2+n)/2", "n/2+n²/2"])(
    "checker accepts %j",
    (input) => {
      expect(sums.check(p, input)).toBe(true);
    },
  );

  it.each([
    "n(n-1)/2",
    "n²/2",
    "n(n+1)",
    "-(n²+n)/2",
    "x(x+1)/2",
    "i(i+1)/2",
    "Σᵢ₌₁ⁿ i",
    "n(n+1)/",
    "(n² + n)/0",
    "",
  ])("checker rejects %j", (input) => {
    expect(sums.check(p, input)).toBe(false);
  });
});

describe("generate", () => {
  it("defaults to both kinds", () => {
    expect(SUMS_KINDS).toEqual(["sum", "loop"]);
    expect(DEFAULT_SUMS).toEqual({ kinds: SUMS_KINDS });
  });

  it("uses only the chosen kinds and eventually both", () => {
    const skills = new Set(SEEDS.map((s) => sums.generate(s, DEFAULT_SUMS).skill));
    expect(skills).toEqual(new Set(["sums.sum", "sums.loop"]));
  });

  it("problem carries its seed and params", () => {
    const p = sums.generate(42, DEFAULT_SUMS);
    expect(p.seed).toBe(42);
    expect(p.params).toEqual(DEFAULT_SUMS);
  });

  it("generate throws without kinds", () => {
    expect(() => sums.generate(1, { kinds: [] })).toThrow(RangeError);
  });
});
