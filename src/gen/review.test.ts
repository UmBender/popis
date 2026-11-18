import { describe, expect, it } from "vitest";
import type { Generator, JsonValue, Problem } from "../core/problem";
import { algebra, type AlgebraSettings } from "./algebra";
import { division, type DivisionSettings } from "./division";
import {
  createReview,
  DEFAULT_REVIEW,
  modeOfSkill,
  parseReviewSettings,
  validateReview,
  type ReviewItem,
} from "./review";

const GENERATORS: Readonly<Record<string, Generator<JsonValue>>> = { division, algebra };
const review = createReview((mode) => GENERATORS[mode]);

const FLOOR: DivisionSettings = { kinds: ["floor"] };
const EXPAND: AlgebraSettings = { kinds: ["expand"] };
const FLOOR_ITEM: ReviewItem = { mode: "division", seed: 7, params: FLOOR };
const EXPAND_ITEM: ReviewItem = { mode: "algebra", seed: 11, params: EXPAND };

describe("review generator", () => {
  it("review has the id review", () => {
    expect(review.id).toBe("review");
  });

  it("review returns the original problem of its only item", () => {
    const problem = review.generate(123, { items: [FLOOR_ITEM] });
    expect(problem).toEqual(division.generate(7, FLOOR));
  });

  it("review keeps the original skill, seed and params", () => {
    const problem = review.generate(5, { items: [EXPAND_ITEM] });
    expect(problem.skill).toBe("algebra.expand");
    expect(problem.seed).toBe(11);
    expect(problem.params).toEqual(EXPAND);
  });

  it("review picks every item for some problem seed", () => {
    const skills = new Set<string>();
    for (let seed = 0; seed < 50; seed++) {
      skills.add(review.generate(seed, { items: [FLOOR_ITEM, EXPAND_ITEM] }).skill);
    }
    expect(skills).toEqual(new Set(["division.floor", "algebra.expand"]));
  });

  it("review checks answers with the original mode's generator", () => {
    const expand = review.generate(1, { items: [EXPAND_ITEM] });
    expect(review.check(expand, expand.answer)).toBe(true);
    expect(review.check(expand, "x")).toBe(false);

    const floor = review.generate(1, { items: [FLOOR_ITEM] });
    expect(review.check(floor, floor.answer)).toBe(true);
    expect(review.check(floor, String(Number(floor.answer) + 1))).toBe(false);
  });

  it("review rejects answers to a problem of an unknown mode", () => {
    const problem: Problem = { skill: "chess.mate", prompt: "?", answer: "1", seed: 1, params: {} };
    expect(review.check(problem, "1")).toBe(false);
  });

  it("review without items throws a RangeError", () => {
    expect(() => review.generate(1, { items: [] })).toThrow(RangeError);
  });

  it("review of an item of an unknown mode throws a RangeError", () => {
    expect(() => review.generate(1, { items: [{ mode: "chess", seed: 1, params: {} }] })).toThrow(
      RangeError,
    );
  });
});

describe("review settings", () => {
  it("modeOfSkill is the skill's prefix before the first dot", () => {
    expect(modeOfSkill("division.cpp-div")).toBe("division");
    expect(modeOfSkill("arithmetic.add")).toBe("arithmetic");
    expect(modeOfSkill("plain")).toBe("plain");
  });

  it("review settings never keep stored items", () => {
    expect(parseReviewSettings({ items: [FLOOR_ITEM] })).toEqual({ items: [] });
    expect(parseReviewSettings(null)).toEqual(DEFAULT_REVIEW);
    expect(DEFAULT_REVIEW).toEqual({ items: [] });
  });

  it("review settings are always valid", () => {
    expect(validateReview(DEFAULT_REVIEW)).toEqual([]);
  });
});
