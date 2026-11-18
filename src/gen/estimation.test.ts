import { describe, expect, it } from "vitest";
import type { Problem } from "../core/problem";
import {
  COMPLEXITY_SCALE,
  DEFAULT_ESTIMATION,
  estimation,
  ESTIMATION_KINDS,
  INT32_MAX,
  INT64_MAX,
  OVERFLOW_CHOICES,
  skillOfKind,
  smallestType,
  superscript,
} from "./estimation";

const SCALE = [
  "O(n!)",
  "O(2ⁿ·n)",
  "O(n³)",
  "O(n²)",
  "O(n√n)",
  "O(n log n)",
  "O(n)",
  "O(√n)",
  "O(log n)",
];

/** Problems of one kind for the first `count` seeds. */
function sample(kind: (typeof ESTIMATION_KINDS)[number], count = 2000): Problem[] {
  return Array.from({ length: count }, (_, seed) => estimation.generate(seed, { kinds: [kind] }));
}

/** The text of the correct option. */
function correct(p: Problem): string | undefined {
  return p.choices?.[Number(p.answer) - 1];
}

describe("check", () => {
  const problem: Problem = {
    skill: "estimation.overflow",
    prompt: "20! cabe em qual tipo?",
    answer: "2",
    choices: ["int32", "int64", "nenhum"],
    seed: 0,
    params: DEFAULT_ESTIMATION,
  };

  it.each(["2", " 2 ", "\t2"])("check accepts the option number %j", (input) => {
    expect(estimation.check(problem, input)).toBe(true);
  });

  it.each(["1", "3", "", "2)", "int64", "02", "22"])("check rejects %j", (input) => {
    expect(estimation.check(problem, input)).toBe(false);
  });
});

describe("helpers", () => {
  it("superscript writes exponents with superscript digits", () => {
    expect(superscript(0)).toBe("⁰");
    expect(superscript(18)).toBe("¹⁸");
    expect(superscript(1234567890)).toBe("¹²³⁴⁵⁶⁷⁸⁹⁰");
  });

  it("smallestType picks the smallest signed type at the exact limits", () => {
    expect(INT32_MAX).toBe(2n ** 31n - 1n);
    expect(INT64_MAX).toBe(2n ** 63n - 1n);
    expect(smallestType(0n)).toBe("int32");
    expect(smallestType(2n ** 31n - 1n)).toBe("int32");
    expect(smallestType(2n ** 31n)).toBe("int64");
    expect(smallestType(2n ** 63n - 1n)).toBe("int64");
    expect(smallestType(2n ** 63n)).toBe("nenhum");
  });

  it("the complexity scale goes from the most to the least expensive class", () => {
    expect(COMPLEXITY_SCALE).toEqual(SCALE);
    expect(OVERFLOW_CHOICES).toEqual(["int32", "int64", "nenhum"]);
  });
});

describe("generate", () => {
  it("defaults to every kind", () => {
    expect(ESTIMATION_KINDS).toEqual(["complexity", "magnitude", "overflow"]);
    expect(DEFAULT_ESTIMATION).toEqual({ kinds: ESTIMATION_KINDS });
  });

  it("writes the kinds as documented", () => {
    const [complexity, magnitude, overflow] = ESTIMATION_KINDS.map((kind) =>
      estimation.generate(3, { kinds: [kind] }),
    );
    expect(complexity?.prompt).toMatch(/^n ≤ \S+, 1 s: maior complexidade viável\?$/);
    expect(complexity?.choices).toHaveLength(4);
    expect(magnitude?.prompt).toMatch(/^O\(.+\) com n = \S+: quantas operações\?$/);
    expect(magnitude?.choices).toHaveLength(4);
    expect(overflow?.prompt).toMatch(/ cabe em qual tipo\?$/);
    expect(overflow?.choices).toEqual(["int32", "int64", "nenhum"]);
  });

  it("complexity options are 4 consecutive classes of the scale", () => {
    for (const p of sample("complexity", 300)) {
      const start = SCALE.indexOf(p.choices?.[0] ?? "");
      expect(start).toBeGreaterThanOrEqual(0);
      expect(p.choices).toEqual(SCALE.slice(start, start + 4));
    }
  });

  it("complexity eventually asks for every class of the scale", () => {
    const answers = new Set(sample("complexity").map(correct));
    expect(answers).toEqual(new Set(SCALE));
  });

  it("complexity answers sit in every option position", () => {
    const positions = new Set(sample("complexity", 500).map((p) => p.answer));
    expect(positions).toEqual(new Set(["1", "2", "3", "4"]));
  });

  it("complexity writes large bounds as powers of ten", () => {
    const prompts = sample("complexity").map((p) => p.prompt);
    expect(prompts).toContain("n ≤ 10¹⁸, 1 s: maior complexidade viável?");
    expect(prompts.some((p) => /^n ≤ [2-9]·10[⁰-⁹]+,/.test(p))).toBe(true);
    expect(prompts.some((p) => /^n ≤ \d{1,4},/.test(p))).toBe(true);
  });

  it("magnitude uses every function and answers in every position", () => {
    const problems = sample("magnitude");
    const functions = new Set(problems.map((p) => /^O\((.+)\) com/.exec(p.prompt)?.[1]));
    expect(functions).toEqual(new Set(["n log n", "n√n", "n²", "n³", "2ⁿ", "n!"]));
    expect(new Set(problems.map((p) => p.answer))).toEqual(new Set(["1", "2", "3", "4"]));
  });

  it("overflow uses every expression form and every answer", () => {
    const problems = sample("overflow");
    const forms = new Set(
      problems.map((p) =>
        /^\d+ × \d+ /.test(p.prompt)
          ? "product"
          : /^\d+! /.test(p.prompt)
            ? "factorial"
            : /^2[⁰-⁹]+ /.test(p.prompt)
              ? "power"
              : /^n\(n \+ 1\)\/2 com n = \d+ /.test(p.prompt)
                ? "sum"
                : p.prompt,
      ),
    );
    expect(forms).toEqual(new Set(["product", "factorial", "power", "sum"]));
    expect(new Set(problems.map(correct))).toEqual(new Set(OVERFLOW_CHOICES));
  });

  it("uses only the chosen kinds and eventually all of them", () => {
    const skills = new Set<string>();
    for (let seed = 0; seed < 100; seed++) {
      skills.add(estimation.generate(seed, { kinds: ["magnitude", "overflow"] }).skill);
    }
    expect(skills).toEqual(new Set([skillOfKind("magnitude"), skillOfKind("overflow")]));
  });

  it("same seed and params give the same problem", () => {
    expect(estimation.generate(41, DEFAULT_ESTIMATION)).toEqual(
      estimation.generate(41, DEFAULT_ESTIMATION),
    );
  });

  it("generate throws without kinds", () => {
    expect(() => estimation.generate(1, { kinds: [] })).toThrow();
  });
});
