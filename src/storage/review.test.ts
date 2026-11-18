import { describe, expect, it } from "vitest";
import type { Problem } from "../core/problem";
import { arithmetic, DEFAULT_ARITHMETIC } from "../gen/arithmetic";
import { division, type DivisionSettings } from "../gen/division";
import type { ReviewItem } from "../gen/review";
import type { Attempt, Outcome } from "../session/engine";
import type { Mode, SessionRecord } from "./history";
import { MAX_REVIEW_ITEMS, reviewItems } from "./review";

const FLOOR: DivisionSettings = { kinds: ["floor"] };
const CEIL: DivisionSettings = { kinds: ["ceil"] };

const floor = (seed: number) => division.generate(seed, FLOOR);
const ceil = (seed: number) => division.generate(seed, CEIL);

function attempt(problem: Problem, outcome: Outcome, timeMs = 1000, corrections = 0): Attempt {
  return { problem, outcome, timeMs, corrections };
}

function session(log: readonly Attempt[], mode: Mode = "division"): SessionRecord {
  return { version: 1, mode, finishedAt: 0, durationMs: 120_000, seed: 0, params: FLOOR, log };
}

function item(problem: Problem, mode = "division"): ReviewItem {
  return { mode, seed: problem.seed, params: problem.params };
}

describe("review items", () => {
  it("review items are empty without history", () => {
    expect(reviewItems([])).toEqual([]);
  });

  it("review items are empty when every answer was right, fast and clean", () => {
    const log = [attempt(floor(1), "correct"), attempt(floor(2), "correct")];
    expect(reviewItems([session(log)])).toEqual([]);
  });

  it("review items include skipped problems", () => {
    const log = [attempt(floor(1), "correct"), attempt(floor(2), "skipped")];
    expect(reviewItems([session(log)])).toEqual([item(floor(2))]);
  });

  it("review items include problems with corrections, right or skipped", () => {
    const log = [
      attempt(floor(1), "correct", 1000, 1),
      attempt(floor(2), "correct"),
      attempt(floor(3), "skipped", 1000, 2),
    ];
    expect(reviewItems([session(log)])).toEqual([item(floor(3)), item(floor(1))]);
  });

  it("review items include right answers slower than 1.5× the skill's mean", () => {
    const log = [
      attempt(floor(1), "correct", 1000),
      attempt(floor(2), "correct", 1000),
      attempt(floor(3), "correct", 1000),
      attempt(floor(4), "correct", 4000),
    ];
    expect(reviewItems([session(log)])).toEqual([item(floor(4))]);
  });

  it("review items leave out an answer exactly 1.5× the skill's mean", () => {
    const log = [
      attempt(floor(1), "correct", 1000),
      attempt(floor(2), "correct", 1000),
      attempt(floor(3), "correct", 2000),
    ];
    expect(reviewItems([session(log)])).toEqual([]);
  });

  it("review items compare speed within the same skill only", () => {
    const log = [
      attempt(floor(1), "correct", 1000),
      attempt(floor(2), "correct", 1000),
      attempt(ceil(3), "correct", 3500),
      attempt(ceil(4), "correct", 3500),
    ];
    expect(reviewItems([session(log)])).toEqual([]);
  });

  it("review items take the mean over right answers only", () => {
    const log = [
      attempt(floor(1), "correct", 1000),
      attempt(floor(2), "correct", 1000),
      attempt(floor(3), "correct", 1000),
      attempt(floor(4), "correct", 2000),
      attempt(floor(5), "skipped", 9000),
    ];
    expect(reviewItems([session(log)])).toEqual([item(floor(5)), item(floor(4))]);
  });

  it("review items compare speed within the same session only", () => {
    const fast = session([attempt(floor(1), "correct", 1000), attempt(floor(2), "correct", 1000)]);
    const slow = session([attempt(floor(3), "correct", 3000)]);
    expect(reviewItems([fast, slow])).toEqual([]);
  });

  it("review items ignore the end-of-session timeout, even with corrections", () => {
    const log = [attempt(floor(1), "correct"), attempt(floor(2), "timeout", 9000, 3)];
    expect(reviewItems([session(log)])).toEqual([]);
  });

  it("review items do not repeat a skill and seed", () => {
    const first = session([attempt(floor(1), "skipped")]);
    const second = session([attempt(floor(1), "skipped"), attempt(ceil(1), "skipped")]);
    expect(reviewItems([first, second])).toEqual([item(ceil(1)), item(floor(1))]);
  });

  it("review items list the most recent first", () => {
    const older = session([attempt(floor(1), "skipped")]);
    const newer = session([attempt(floor(2), "skipped"), attempt(floor(3), "skipped")]);
    expect(reviewItems([older, newer])).toEqual([
      item(floor(3)),
      item(floor(2)),
      item(floor(1)),
    ]);
  });

  it("review items keep the 50 most recent", () => {
    const log = Array.from({ length: 60 }, (_, i) => attempt(floor(i), "skipped"));
    const items = reviewItems([session(log)]);
    expect(MAX_REVIEW_ITEMS).toBe(50);
    expect(items).toHaveLength(50);
    expect(items[0]).toEqual(item(floor(59)));
    expect(items[49]).toEqual(item(floor(10)));
  });

  it("review items include arithmetic problems", () => {
    const problem = arithmetic.generate(4, DEFAULT_ARITHMETIC);
    const log = [attempt(problem, "correct", 1000, 1)];
    expect(reviewItems([session(log, "arithmetic")])).toEqual([item(problem, "arithmetic")]);
  });

  it("review items come back from review sessions with their original mode", () => {
    const log = [attempt(floor(8), "skipped")];
    expect(reviewItems([session(log, "review")])).toEqual([item(floor(8))]);
  });

  it("review items drop problems that regenerate differently", () => {
    const changed = { ...floor(1), prompt: "⌊1 / 2⌋" };
    const log = [attempt(changed, "skipped"), attempt(floor(2), "skipped")];
    expect(reviewItems([session(log)])).toEqual([item(floor(2))]);
  });

  it("review items drop problems with invalid params or an unknown mode", () => {
    const badParams = { ...floor(1), params: { kinds: [] } };
    const unknown = { ...floor(2), skill: "chess.mate" };
    const review = { ...floor(3), skill: "review.any" };
    const log = [attempt(badParams, "skipped"), attempt(unknown, "skipped"), attempt(review, "skipped")];
    expect(reviewItems([session(log)])).toEqual([]);
  });
});
