import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { Generator, JsonValue } from "../core/problem";
import { MAX_SEED } from "../core/rng";
import { ALGEBRA_KINDS, algebra } from "./algebra";
import { DIVISION_KINDS, division } from "./division";
import { createReview, type ReviewItem } from "./review";

const GENERATORS: Readonly<Record<string, Generator<JsonValue>>> = { division, algebra };
const review = createReview((mode) => GENERATORS[mode]);

const seed = fc.integer({ min: 0, max: MAX_SEED });

const item: fc.Arbitrary<ReviewItem> = fc.oneof(
  fc.record({
    mode: fc.constant("division"),
    seed,
    params: fc.record({ kinds: fc.subarray([...DIVISION_KINDS], { minLength: 1 }) }),
  }),
  fc.record({
    mode: fc.constant("algebra"),
    seed,
    params: fc.record({ kinds: fc.subarray([...ALGEBRA_KINDS], { minLength: 1 }) }),
  }),
);

const items = fc.array(item, { minLength: 1, maxLength: 5 });

function original(i: ReviewItem) {
  const generator = GENERATORS[i.mode];
  if (generator === undefined) throw new Error(`no generator for ${i.mode}`);
  return generator.generate(i.seed, i.params);
}

describe("review generator properties", () => {
  it("the canonical answer is accepted", () => {
    fc.assert(
      fc.property(seed, items, (s, list) => {
        const p = review.generate(s, { items: list });
        expect(review.check(p, p.answer)).toBe(true);
      }),
    );
  });

  it("the problem is the original problem of one of the items", () => {
    fc.assert(
      fc.property(seed, items, (s, list) => {
        const p = review.generate(s, { items: list });
        expect(list.map(original)).toContainEqual(p);
      }),
    );
  });

  it("the same seed gives the same problem", () => {
    fc.assert(
      fc.property(seed, items, (s, list) => {
        expect(review.generate(s, { items: list })).toEqual(review.generate(s, { items: list }));
      }),
    );
  });
});
