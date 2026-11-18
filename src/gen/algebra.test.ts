import { describe, expect, it } from "vitest";
import type { Problem } from "../core/problem";
import { ALGEBRA_KINDS, algebra, DEFAULT_ALGEBRA, skillOfKind, type AlgebraKind } from "./algebra";

function problem(kind: AlgebraKind, prompt: string, answer: string): Problem {
  return { skill: skillOfKind(kind), prompt, answer, seed: 0, params: DEFAULT_ALGEBRA };
}

describe("expanded answers", () => {
  const p = problem("expand", "Expanda: (2x − 3)(x + 5)", "2x² + 7x − 15");

  it.each(["2x² + 7x − 15", "2x^2+7x-15", "7x - 15 + 2x^2", "-15+7x+2x²", "2·x·x + 7x − 15"])(
    "expanded accepts %j",
    (input) => {
      expect(algebra.check(p, input)).toBe(true);
    },
  );

  it.each([
    "(2x-3)(x+5)",
    "2x^2 + 7x - 15 + (0)",
    "2x^2 + 10x - 3x - 15",
    "2x^2 + 7x + 15",
    "2x^2 + 7x",
    "",
  ])("expanded rejects %j", (input) => {
    expect(algebra.check(p, input)).toBe(false);
  });

  it.each(["2x² + 7x − 15/2", "2x²/7 + 7x/7 − 15/7", "2x²/2 + 7x/2 − 15/2"])(
    "expanded rejects an answer divided by a constant: %j",
    (input) => {
      expect(algebra.check(p, input)).toBe(false);
    },
  );

  it("simplify and divide use the same expanded check", () => {
    const s = problem("simplify", "Simplifique: 3(x − 2) − 2(x + 1) + x", "2x − 8");
    expect(algebra.check(s, "2x-8")).toBe(true);
    expect(algebra.check(s, "x + x - 8")).toBe(false);
    const d = problem("divide", "Divida: (x³ − 1) ÷ (x − 1)", "x² + x + 1");
    expect(algebra.check(d, "x^2+x+1")).toBe(true);
    expect(algebra.check(d, "x^3-1")).toBe(false);
  });
});

describe("completed squares", () => {
  const p = problem("square", "Complete o quadrado: x² + 6x + 2", "(x + 3)² − 7");

  it.each(["(x + 3)² − 7", "(x+3)^2-7", "-7 + (x+3)^2", "(x+3)(x+3) - 7", "(3+x)^2-7"])(
    "square accepts %j",
    (input) => {
      expect(algebra.check(p, input)).toBe(true);
    },
  );

  it.each(["x^2+6x+2", "(x+3)^2-9+2", "(x+1)(x+5)-3", "(x+3)^2+7", "(x-3)^2-7", "(x+3)^2"])(
    "square rejects %j",
    (input) => {
      expect(algebra.check(p, input)).toBe(false);
    },
  );

  it("square rejects a square divided by a constant", () => {
    expect(algebra.check(p, "(x+3)^2/2 - 7")).toBe(false);
    expect(algebra.check(p, "(x+3)^2/2 - 7/2")).toBe(false);
  });
});

describe("generate", () => {
  it("defaults to every kind", () => {
    expect(ALGEBRA_KINDS).toEqual(["expand", "simplify", "square", "divide"]);
    expect(DEFAULT_ALGEBRA).toEqual({ kinds: ALGEBRA_KINDS });
  });

  it("prompts start with the instruction", () => {
    const prefixes = ["Expanda: ", "Simplifique: ", "Complete o quadrado: ", "Divida: "];
    ALGEBRA_KINDS.forEach((kind, i) => {
      expect(algebra.generate(7, { kinds: [kind] }).prompt.startsWith(prefixes[i] ?? "")).toBe(
        true,
      );
    });
  });

  it("same seed and params give the same problem", () => {
    expect(algebra.generate(5, DEFAULT_ALGEBRA)).toEqual(algebra.generate(5, DEFAULT_ALGEBRA));
  });

  it("generate throws without kinds", () => {
    expect(() => algebra.generate(1, { kinds: [] })).toThrow();
  });
});
