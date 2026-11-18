import { describe, expect, it } from "vitest";
import type { Problem } from "../core/problem";
import {
  ceilDiv,
  cppDiv,
  cppMod,
  DEFAULT_DIVISION,
  division,
  DIVISION_KINDS,
  floorDiv,
  inequalityAnswer,
  mathMod,
  skillOfKind,
} from "./division";

describe("reference operations", () => {
  it.each([
    [7, 2, 3],
    [-7, 2, -3],
    [7, -2, -3],
    [-7, -2, 3],
  ])("C++ %i / %i is %i (truncates toward zero)", (a, b, q) => {
    expect(cppDiv(a, b)).toBe(q);
  });

  it.each([
    [7, 3, 1],
    [-7, 3, -1],
    [7, -3, 1],
    [-7, -3, -1],
  ])("C++ %i %% %i is %i (sign of the dividend)", (a, b, r) => {
    expect(cppMod(a, b)).toBe(r);
  });

  it.each([
    [-7, 2, -4, -3],
    [7, 2, 3, 4],
    [7, -2, -4, -3],
    [-7, -2, 3, 4],
  ])("floor and ceil of %i / %i are %i and %i", (a, b, f, c) => {
    expect(floorDiv(a, b)).toBe(f);
    expect(ceilDiv(a, b)).toBe(c);
  });

  it.each([
    [-7, 3, 2],
    [7, 3, 1],
    [-9, 3, 0],
  ])("%i mod %i is %i", (a, b, r) => {
    expect(mathMod(a, b)).toBe(r);
  });

  it("inequality answers are the extreme integer solutions", () => {
    // 3x + 7 ≤ 50 → x ≤ 14.33…
    expect(inequalityAnswer({ a: 3, b: 7, rel: "≤", c: 50 })).toEqual({ want: "max", x: 14 });
    // 3x + 7 ≥ 50 → x ≥ 14.33…
    expect(inequalityAnswer({ a: 3, b: 7, rel: "≥", c: 50 })).toEqual({ want: "min", x: 15 });
    // −3x + 7 ≤ 50 → x ≥ −14.33…
    expect(inequalityAnswer({ a: -3, b: 7, rel: "≤", c: 50 })).toEqual({ want: "min", x: -14 });
    // −3x + 7 ≥ 50 → x ≤ −14.33…
    expect(inequalityAnswer({ a: -3, b: 7, rel: "≥", c: 50 })).toEqual({ want: "max", x: -15 });
  });
});

describe("check", () => {
  const problem: Problem = {
    skill: "division.floor",
    prompt: "⌊−7 / 2⌋",
    answer: "-4",
    seed: 0,
    params: DEFAULT_DIVISION,
  };

  it.each(["-4", "−4", " -4 ", "\t−4"])("check accepts %j", (input) => {
    expect(division.check(problem, input)).toBe(true);
  });

  it.each(["4", "-3", "-", "", "--4", "-04"])("check rejects %j", (input) => {
    expect(division.check(problem, input)).toBe(false);
  });
});

describe("generate", () => {
  it("defaults to every kind", () => {
    expect(DEFAULT_DIVISION).toEqual({ kinds: DIVISION_KINDS });
    expect(DIVISION_KINDS).toEqual(["cpp-div", "cpp-mod", "floor", "ceil", "mod", "inequality"]);
  });

  it("writes the kinds as documented", () => {
    const prompts = DIVISION_KINDS.map((kind) => division.generate(3, { kinds: [kind] }).prompt);
    expect(prompts[0]).toMatch(/^C\+\+: −?\d+ \/ −?\d+$/);
    expect(prompts[1]).toMatch(/^C\+\+: −?\d+ % −?\d+$/);
    expect(prompts[2]).toMatch(/^⌊−?\d+ \/ −?\d+⌋$/);
    expect(prompts[3]).toMatch(/^⌈−?\d+ \/ −?\d+⌉$/);
    expect(prompts[4]).toMatch(/^−?\d+ mod \d+$/);
    expect(prompts[5]).toMatch(/^(maior|menor) x inteiro: .+ [≤≥] −?\d+$/);
  });

  it("uses only the chosen kinds and eventually all of them", () => {
    const skills = new Set<string>();
    for (let seed = 0; seed < 100; seed++) {
      skills.add(division.generate(seed, { kinds: ["mod", "inequality"] }).skill);
    }
    expect(skills).toEqual(new Set([skillOfKind("mod"), skillOfKind("inequality")]));
  });

  it("same seed and params give the same problem", () => {
    expect(division.generate(41, DEFAULT_DIVISION)).toEqual(
      division.generate(41, DEFAULT_DIVISION),
    );
  });

  it("generate throws without kinds", () => {
    expect(() => division.generate(1, { kinds: [] })).toThrow();
  });
});
