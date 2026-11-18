import { describe, expect, it } from "vitest";
import type { Problem } from "../core/problem";
import {
  DEFAULT_FACTORING,
  factoring,
  LEVELS,
  parseFactoringSettings,
  skillOfLevel,
  validateFactoring,
  type FactoringSettings,
} from "./factoring";

function problem(prompt: string, answer: string): Problem {
  return { skill: "factoring.test", prompt, answer, seed: 0, params: DEFAULT_FACTORING };
}

describe("DEFAULT_FACTORING", () => {
  it("starts at level 1", () => {
    expect(DEFAULT_FACTORING).toEqual({ levels: [1] });
    expect(LEVELS).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe("check: monic quadratic", () => {
  const p = problem("x² − 2x − 15", "(x − 5)(x + 3)");

  it.each(["(x − 5)(x + 3)", "(x-5)(x+3)", "(x+3)(x-5)", "(x + 3)*(x - 5)", "(5-x)(-3-x)"])(
    "check accepts %s",
    (input) => {
      expect(factoring.check(p, input)).toBe(true);
    },
  );

  it.each(["x^2-2x-15", "(x^2-2x-15)", "(x+5)(x-3)", "-(x-5)(x+3)", "(x-5)(x+3", "(x-5)", ""])(
    "check rejects %s",
    (input) => {
      expect(factoring.check(p, input)).toBe(false);
    },
  );

  it.each(["(x-5)(x+3)/7", "(x-5)(x+3)/(-1)", "(x-5)(x+3)/2"])(
    "check rejects the answer divided by a constant: %s",
    (input) => {
      expect(factoring.check(p, input)).toBe(false);
    },
  );
});

describe("check: common factor", () => {
  const p = problem("3x² − 12x + 9", "3(x − 1)(x − 3)");

  it("check accepts the constant in front or inside a factor", () => {
    expect(factoring.check(p, "3(x-3)(x-1)")).toBe(true);
    expect(factoring.check(p, "(3x-3)(x-3)")).toBe(true);
  });

  it("check rejects a partial factoring or a missing constant", () => {
    expect(factoring.check(p, "3(x^2-4x+3)")).toBe(false);
    expect(factoring.check(p, "(x-1)(x-3)")).toBe(false);
  });
});

describe("check: special products and two variables", () => {
  it("check accepts a perfect square written either way", () => {
    const p = problem("x² − 4x + 4", "(x − 2)²");
    expect(factoring.check(p, "(x-2)^2")).toBe(true);
    expect(factoring.check(p, "(x-2)(x-2)")).toBe(true);
    expect(factoring.check(p, "(2-x)^2")).toBe(true);
    expect(factoring.check(p, "(x-2)")).toBe(false);
  });

  it("check accepts a sum of cubes and rejects it unfactored", () => {
    const p = problem("x³ + 8", "(x + 2)(x² − 2x + 4)");
    expect(factoring.check(p, "(x+2)(x^2-2x+4)")).toBe(true);
    expect(factoring.check(p, "x^3+8")).toBe(false);
  });

  it("check accepts two-variable factors in any order", () => {
    const p = problem("x² − 5xy + 6y²", "(x − 2y)(x − 3y)");
    expect(factoring.check(p, "(x-3y)(x-2y)")).toBe(true);
    expect(factoring.check(p, "(x-2)(x-3)")).toBe(false);
  });
});

describe("generate", () => {
  it("same seed and params give the same problem", () => {
    const all: FactoringSettings = { levels: LEVELS };
    expect(factoring.generate(99, all)).toEqual(factoring.generate(99, all));
  });

  it("problem carries its seed and params", () => {
    const p = factoring.generate(7, DEFAULT_FACTORING);
    expect(p.seed).toBe(7);
    expect(p.params).toEqual(DEFAULT_FACTORING);
  });

  it("uses only the chosen levels and eventually all of them", () => {
    const settings: FactoringSettings = { levels: [2, 5] };
    const skills = new Set<string>();
    for (let seed = 0; seed < 100; seed++) skills.add(factoring.generate(seed, settings).skill);
    expect(skills).toEqual(new Set([skillOfLevel(2), skillOfLevel(5)]));
  });

  it("each level has its own skill", () => {
    expect(new Set(LEVELS.map(skillOfLevel)).size).toBe(LEVELS.length);
  });

  it("generate throws on invalid settings", () => {
    expect(() => factoring.generate(1, { levels: [] })).toThrow();
  });
});

describe("settings", () => {
  it("validates the level list", () => {
    expect(validateFactoring(DEFAULT_FACTORING)).toEqual([]);
    expect(validateFactoring({ levels: [] })).toEqual(["no-level"]);
  });

  it("parseFactoringSettings round-trips, deduplicates and rejects bad input", () => {
    expect(parseFactoringSettings({ levels: [3, 1] })).toEqual({ levels: [3, 1] });
    expect(parseFactoringSettings({ levels: [2, 2] })).toEqual({ levels: [2] });
    expect(parseFactoringSettings({ levels: [] })).toBeNull();
    expect(parseFactoringSettings({ levels: [7] })).toBeNull();
    expect(parseFactoringSettings({ levels: "1" })).toBeNull();
    expect(parseFactoringSettings(null)).toBeNull();
  });
});
