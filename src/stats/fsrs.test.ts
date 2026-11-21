import { describe, expect, it } from "vitest";
import { DAY_MS } from "./summary";
import {
  DEFAULT_RETENTION,
  FSRS_DECAY,
  FSRS_DEFAULT_WEIGHTS,
  FSRS_FACTOR,
  FSRS_VERSION,
  gradeAttempt,
  isDue,
  newCard,
  nextIntervalDays,
  retrievability,
  reviewCard,
} from "./fsrs";

const T0 = Date.UTC(2026, 10, 1, 12, 0, 0);

describe("FSRS-4.5 reference implementation (AC-3)", () => {
  it("exposes FSRS-4.5 constants and 17 default weights", () => {
    expect(FSRS_VERSION).toBe("FSRS-4.5");
    expect(FSRS_DECAY).toBe(-0.5);
    expect(FSRS_FACTOR).toBeCloseTo(19 / 81, 12);
    expect(DEFAULT_RETENTION).toBe(0.9);
    expect(FSRS_DEFAULT_WEIGHTS).toHaveLength(17);
  });

  it("retrievability equals 1 at t=0 and 0.9 at t=S", () => {
    expect(retrievability(0, 5)).toBe(1);
    expect(retrievability(5, 5)).toBeCloseTo(0.9, 10);
    expect(retrievability(10, 5)).toBeLessThan(0.9);
  });

  it("nextIntervalDays equals S at 90% desired retention and scales with retention", () => {
    expect(nextIntervalDays(3.7145, 0.9)).toBeCloseTo(3.7145, 8);
    expect(nextIntervalDays(10, 0.85)).toBeGreaterThan(10);
    expect(nextIntervalDays(10, 0.95)).toBeLessThan(10);
  });

  it("matches exact FSRS-4.5 initial stability and difficulty for ratings 1 to 4", () => {
    const base = newCard(T0);
    expect(isDue(base, T0)).toBe(true);

    const again = reviewCard(base, 1, T0);
    expect(again.stability).toBeCloseTo(0.4872, 4);
    expect(again.difficulty).toBeCloseTo(7.6214, 4);
    expect(again.reps).toBe(1);
    expect(again.lapses).toBe(1);

    const hard = reviewCard(base, 2, T0);
    expect(hard.stability).toBeCloseTo(1.4003, 4);
    expect(hard.difficulty).toBeCloseTo(6.3916, 4);
    expect(hard.lapses).toBe(0);

    const good = reviewCard(base, 3, T0);
    expect(good.stability).toBeCloseTo(3.7145, 4);
    expect(good.difficulty).toBeCloseTo(5.1618, 4);
    expect(good.dueAt).toBe(T0 + Math.round(3.7145 * DAY_MS));
    expect(isDue(good, T0)).toBe(false);
    expect(isDue(good, good.dueAt)).toBe(true);

    const easy = reviewCard(base, 4, T0);
    expect(easy.stability).toBeCloseTo(13.8206, 4);
    expect(easy.difficulty).toBeCloseTo(3.932, 4);
  });

  it("matches exact FSRS-4.5 second review values on recall (Good/Hard/Easy) and lapse (Again)", () => {
    const first = reviewCard(newCard(T0), 3, T0);
    const t2 = T0 + Math.round(first.stability * DAY_MS);

    // Good recall at R = 0.9
    const secondGood = reviewCard(first, 3, t2);
    expect(secondGood.difficulty).toBeCloseTo(5.1618, 4);
    expect(secondGood.stability).toBeCloseTo(14.0958, 2);
    expect(secondGood.reps).toBe(2);
    expect(secondGood.lapses).toBe(0);

    // Hard recall grows stability less than Good; Easy grows more than Good
    const secondHard = reviewCard(first, 2, t2);
    const secondEasy = reviewCard(first, 4, t2);
    expect(secondHard.stability).toBeGreaterThan(first.stability);
    expect(secondHard.stability).toBeLessThan(secondGood.stability);
    expect(secondEasy.stability).toBeGreaterThan(secondGood.stability);

    // Lapse (Again) lowers stability and raises difficulty
    const lapse = reviewCard(first, 1, t2);
    expect(lapse.stability).toBeCloseTo(1.4173, 2);
    expect(lapse.stability).toBeLessThan(first.stability);
    expect(lapse.difficulty).toBeCloseTo(6.9012, 3);
    expect(lapse.lapses).toBe(1);
  });

  it("gradeAttempt maps attempt outcomes to ratings 1 to 4", () => {
    expect(gradeAttempt({ ok: false, corrections: 0, timeMs: 500, medianMs: 1000 })).toBe(1);
    expect(gradeAttempt({ ok: true, corrections: 1, timeMs: 800, medianMs: 1000 })).toBe(2);
    expect(gradeAttempt({ ok: true, corrections: 0, timeMs: 1600, medianMs: 1000 })).toBe(2);
    expect(gradeAttempt({ ok: true, corrections: 0, timeMs: 1200, medianMs: 1000 })).toBe(3);
    expect(gradeAttempt({ ok: true, corrections: 0, timeMs: 1000, medianMs: 1000 })).toBe(3);
    expect(gradeAttempt({ ok: true, corrections: 0, timeMs: 900, medianMs: 1000 })).toBe(4);
    expect(gradeAttempt({ ok: true, corrections: 0, timeMs: 900, medianMs: null })).toBe(3);
  });
});
