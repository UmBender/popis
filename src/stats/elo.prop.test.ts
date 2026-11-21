import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { chooseNextLevel, defaultLevelRatings, expectedWin, updateElo } from "./elo";

const ratingArb = fc.double({ min: 400, max: 2200, noNaN: true });
const countArb = fc.integer({ min: 0, max: 500 });

describe("elo properties (AC-1, AC-2)", () => {
  it("user and item rating deltas always sum to zero", () => {
    fc.assert(
      fc.property(ratingArb, ratingArb, countArb, countArb, fc.boolean(), (u, i, uc, ic, win) => {
        const res = updateElo({ rating: u, count: uc }, { rating: i, count: ic }, win);
        expect(res.deltaUser + res.deltaItem).toBeCloseTo(0, 10);
      }),
    );
  });

  it("consecutive wins strictly increase the user rating", () => {
    fc.assert(
      fc.property(ratingArb, ratingArb, fc.integer({ min: 1, max: 15 }), (u, i, streak) => {
        let user = { rating: u, count: 0 };
        let item = { rating: i, count: 0 };
        for (let k = 0; k < streak; k++) {
          const prev = user.rating;
          const res = updateElo(user, item, true);
          expect(res.user.rating).toBeGreaterThan(prev);
          user = res.user;
          item = res.item;
        }
      }),
    );
  });

  it("expectedWin is always strictly inside (0, 1)", () => {
    fc.assert(
      fc.property(ratingArb, ratingArb, (u, i) => {
        const p = expectedWin(u, i);
        expect(p).toBeGreaterThan(0);
        expect(p).toBeLessThan(1);
      }),
    );
  });

  it("chooseNextLevel never jumps more than one level and stays in bounds", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 10 }),
        ratingArb,
        fc.double({ min: 0.7, max: 0.95, noNaN: true }),
        fc.integer({ min: 1, max: 10 }),
        (levels, u, target, rawCurrent) => {
          const currentLevel = ((rawCurrent - 1) % levels) + 1;
          const next = chooseNextLevel({
            currentLevel,
            userRating: u,
            levelRatings: defaultLevelRatings(levels),
            targetAccuracy: target,
          });
          expect(next).toBeGreaterThanOrEqual(1);
          expect(next).toBeLessThanOrEqual(levels);
          expect(Math.abs(next - currentLevel)).toBeLessThanOrEqual(1);
        },
      ),
    );
  });
});
