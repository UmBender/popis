import { describe, expect, it } from "vitest";
import type { Problem } from "../core/problem";
import type { Attempt, Outcome } from "./engine";
import { summarize } from "./stats";

let nextSeed = 0;

function attempt(skill: string, outcome: Outcome, timeMs: number): Attempt {
  const problem: Problem = {
    skill,
    prompt: `${skill} #${nextSeed}`,
    answer: "0",
    seed: nextSeed++,
    params: {},
  };
  return { problem, outcome, timeMs, corrections: 0 };
}

describe("summarize", () => {
  it("empty log has zero score and no stats", () => {
    expect(summarize([])).toEqual({
      score: 0,
      skipped: 0,
      meanMs: null,
      bySkill: [],
      slowest: [],
    });
  });

  it("score counts only correct attempts", () => {
    const log = [
      attempt("a", "correct", 100),
      attempt("a", "skipped", 100),
      attempt("a", "timeout", 100),
      attempt("b", "correct", 100),
    ];
    const summary = summarize(log);
    expect(summary.score).toBe(2);
    expect(summary.skipped).toBe(1);
  });

  it("means use only correct attempts", () => {
    const log = [
      attempt("a", "correct", 1000),
      attempt("a", "correct", 3000),
      attempt("a", "timeout", 50_000),
    ];
    const summary = summarize(log);
    expect(summary.meanMs).toBe(2000);
    expect(summary.bySkill).toEqual([{ skill: "a", count: 2, meanMs: 2000 }]);
  });

  it("per-skill stats list the slowest skill first", () => {
    const log = [
      attempt("fast", "correct", 500),
      attempt("slow", "correct", 3000),
      attempt("mid", "correct", 1000),
      attempt("mid", "correct", 2000),
    ];
    expect(summarize(log).bySkill.map((s) => s.skill)).toEqual(["slow", "mid", "fast"]);
  });

  it("slowest lists correct attempts by time, slowest first, limited to the count", () => {
    const log = [
      attempt("a", "correct", 100),
      attempt("a", "correct", 900),
      attempt("a", "timeout", 99_999),
      attempt("a", "correct", 500),
      attempt("a", "correct", 700),
    ];
    expect(summarize(log, 3).slowest.map((a) => a.timeMs)).toEqual([900, 700, 500]);
  });

  it("slowest keeps log order on ties", () => {
    const first = attempt("a", "correct", 400);
    const second = attempt("a", "correct", 400);
    expect(summarize([first, second]).slowest).toEqual([first, second]);
  });
});
