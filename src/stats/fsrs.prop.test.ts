import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { DAY_MS } from "./summary";
import { newCard, nextIntervalDays, retrievability, reviewCard, type Rating } from "./fsrs";

const T0 = Date.UTC(2026, 10, 1, 12, 0, 0);
const ratingArb = fc.constantFrom<Rating>(1, 2, 3, 4);
const passRatingArb = fc.constantFrom<Rating>(2, 3, 4);

describe("FSRS properties (AC-3)", () => {
  it("retrievability strictly decreases as elapsed time increases", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.1, max: 365, noNaN: true }),
        fc.double({ min: 0, max: 200, noNaN: true }),
        fc.double({ min: 0.01, max: 200, noNaN: true }),
        (stability, t1, dt) => {
          const r1 = retrievability(t1, stability);
          const r2 = retrievability(t1 + dt, stability);
          expect(r1).toBeGreaterThan(r2);
          expect(r2).toBeGreaterThan(0);
          expect(r1).toBeLessThanOrEqual(1);
        },
      ),
    );
  });

  it("stability grows after a successful review with positive elapsed time", () => {
    fc.assert(
      fc.property(
        ratingArb,
        passRatingArb,
        fc.double({ min: 0.1, max: 30, noNaN: true }),
        (r1, r2, days) => {
          const c1 = reviewCard(newCard(T0), r1, T0);
          const c2 = reviewCard(c1, r2, T0 + Math.round(days * DAY_MS));
          expect(c2.stability).toBeGreaterThan(c1.stability);
        },
      ),
    );
  });

  it("a lapse (Again) never increases stability", () => {
    fc.assert(
      fc.property(passRatingArb, fc.double({ min: 0.5, max: 60, noNaN: true }), (r1, days) => {
        const c1 = reviewCard(newCard(T0), r1, T0);
        const c2 = reviewCard(c1, 1, T0 + Math.round(days * DAY_MS));
        expect(c2.stability).toBeLessThanOrEqual(c1.stability);
        expect(c2.lapses).toBe(c1.lapses + 1);
      }),
    );
  });

  it("difficulty stays clamped inside [1, 10] across any sequence of ratings", () => {
    fc.assert(
      fc.property(fc.array(ratingArb, { minLength: 1, maxLength: 12 }), (ratings) => {
        let card = newCard(T0);
        let now = T0;
        for (const r of ratings) {
          card = reviewCard(card, r, now);
          expect(card.difficulty).toBeGreaterThanOrEqual(1);
          expect(card.difficulty).toBeLessThanOrEqual(10);
          expect(card.stability).toBeGreaterThan(0);
          now += Math.max(DAY_MS, Math.round(nextIntervalDays(card.stability) * DAY_MS));
        }
      }),
    );
  });
});
