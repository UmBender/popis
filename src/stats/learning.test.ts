import { describe, expect, it } from "vitest";
import { createRng } from "../core/rng";
import { DAY_MS, dayOf } from "./summary";
import {
  detectPlateau,
  evaluateGoal,
  fitPowerLaw,
  parseDay,
  theilSenSlope,
  WEEK_MS,
  weeklyRate,
  type RoundPoint,
} from "./learning";

const BASE_DAY = parseDay("2026-01-01") ?? 0;

describe("parseDay", () => {
  it("parseDay round-trips civil dates with dayOf", () => {
    for (const day of ["1970-01-01", "2024-02-29", "2026-01-01", "2026-11-21", "2027-12-31"]) {
      const ms = parseDay(day);
      expect(ms).not.toBeNull();
      expect(dayOf(ms as number)).toBe(day);
    }
  });

  it("parseDay returns null for malformed or impossible dates", () => {
    expect(parseDay("")).toBeNull();
    expect(parseDay("2026-13-01")).toBeNull();
    expect(parseDay("2026-02-30")).toBeNull();
    expect(parseDay("not-a-date")).toBeNull();
  });
});

describe("fitPowerLaw", () => {
  it("fitPowerLaw returns null with fewer than 8 rounds", () => {
    const pts: RoundPoint[] = Array.from({ length: 7 }, (_, i) => ({
      at: BASE_DAY + i * DAY_MS,
      score: 20 + i * 2,
    }));
    expect(fitPowerLaw(pts)).toBeNull();
  });

  it("fitPowerLaw recovers a and c within 10% on seeded noisy power-law data", () => {
    const rng = createRng(42);
    const trueA = 60;
    const trueB = 30;
    const trueC = 0.5;
    const pts: RoundPoint[] = Array.from({ length: 30 }, (_, idx) => {
      const n = idx + 1;
      const noise = (rng.next() - 0.5) * 0.6;
      return {
        at: BASE_DAY + idx * DAY_MS,
        score: trueA - trueB * Math.pow(n, -trueC) + noise,
      };
    });
    const fit = fitPowerLaw(pts);
    expect(fit).not.toBeNull();
    expect(Math.abs((fit?.a ?? 0) - trueA) / trueA).toBeLessThan(0.1);
    expect(Math.abs((fit?.c ?? 0) - trueC) / trueC).toBeLessThan(0.1);
    expect(fit?.predict(1)).toBeCloseTo(trueA - trueB, 0);
  });

  it("fitPowerLaw ignores assisted rounds when counting and fitting", () => {
    const pts: RoundPoint[] = [
      ...Array.from({ length: 7 }, (_, i) => ({
        at: BASE_DAY + i * DAY_MS,
        score: 20 + i * 3,
      })),
      { at: BASE_DAY + 7 * DAY_MS, score: 80, assisted: true },
    ];
    expect(fitPowerLaw(pts)).toBeNull();
  });

  it("fitPowerLaw returns null when data does not improve", () => {
    const flat: RoundPoint[] = Array.from({ length: 12 }, (_, i) => ({
      at: BASE_DAY + i * DAY_MS,
      score: 40,
    }));
    expect(fitPowerLaw(flat)).toBeNull();
  });
});

describe("theilSenSlope and detectPlateau", () => {
  it("theilSenSlope returns null with fewer than 2 distinct x values", () => {
    expect(theilSenSlope([])).toBeNull();
    expect(theilSenSlope([[1, 10]])).toBeNull();
    expect(
      theilSenSlope([
        [1, 10],
        [1, 20],
      ]),
    ).toBeNull();
  });

  it("theilSenSlope ignores a single extreme outlier in the middle", () => {
    const pts: [number, number][] = Array.from({ length: 10 }, (_, i) => [
      i + 1,
      i === 4 ? 0 : 30 + i * 2,
    ]);
    expect(theilSenSlope(pts)).toBeCloseTo(2, 5);
  });

  it("detectPlateau returns null with fewer than 10 unassisted rounds", () => {
    const pts: RoundPoint[] = Array.from({ length: 9 }, (_, i) => ({
      at: BASE_DAY + i * DAY_MS,
      score: 40,
    }));
    expect(detectPlateau(pts)).toBeNull();
  });

  it("detectPlateau flags non-positive slope over last 10 rounds and ignores an outlier", () => {
    // 10 flat rounds with one terrible round in the middle -> still a plateau.
    const flat: RoundPoint[] = Array.from({ length: 10 }, (_, i) => ({
      at: BASE_DAY + i * DAY_MS,
      score: i === 5 ? 5 : 42,
    }));
    const plateau = detectPlateau(flat);
    expect(plateau).not.toBeNull();
    expect(plateau?.since).toBe(BASE_DAY);
    expect(plateau?.slope).toBeLessThanOrEqual(0);

    // 10 clearly improving rounds with one terrible round in the middle -> NOT a plateau.
    const improving: RoundPoint[] = Array.from({ length: 10 }, (_, i) => ({
      at: BASE_DAY + i * DAY_MS,
      score: i === 5 ? 2 : 30 + i * 2,
    }));
    expect(detectPlateau(improving)).toBeNull();
  });
});

describe("weeklyRate", () => {
  it("weeklyRate computes slope per week over the last 4 weeks", () => {
    const now = BASE_DAY + 10 * WEEK_MS;
    // Older steep jump outside the 4-week window should be ignored.
    const pts: RoundPoint[] = [
      { at: now - 8 * WEEK_MS, score: 10 },
      { at: now - 4 * WEEK_MS, score: 40 },
      { at: now - 3 * WEEK_MS, score: 41.5 },
      { at: now - 2 * WEEK_MS, score: 43 },
      { at: now - 1 * WEEK_MS, score: 44.5 },
      { at: now, score: 46 },
    ];
    expect(weeklyRate(pts, now)).toBeCloseTo(1.5, 4);
  });

  it("weeklyRate returns null when points span less than a day", () => {
    const pts: RoundPoint[] = [
      { at: BASE_DAY, score: 30 },
      { at: BASE_DAY + 60_000, score: 35 },
    ];
    expect(weeklyRate(pts, BASE_DAY + 60_000)).toBeNull();
  });
});

describe("evaluateGoal", () => {
  it("evaluateGoal reports above or below the CBM goal line", () => {
    const goal = {
      target: 60,
      deadline: "2026-01-29", // 28 days = 4 weeks after 2026-01-01
      setAt: BASE_DAY,
      baseline: 40,
    };
    // Halfway (14 days): expected is 50.
    const mid = BASE_DAY + 14 * DAY_MS;
    const above = evaluateGoal(goal, { at: mid, score: 52 });
    expect(above).toEqual({ expected: 50, delta: 2, above: true });

    const below = evaluateGoal(goal, { at: mid, score: 47 });
    expect(below).toEqual({ expected: 50, delta: -3, above: false });
  });

  it("evaluateGoal returns null when deadline is invalid or not after setAt", () => {
    expect(
      evaluateGoal(
        { target: 60, deadline: "bad", setAt: BASE_DAY, baseline: 40 },
        { at: BASE_DAY + DAY_MS, score: 45 },
      ),
    ).toBeNull();
    expect(
      evaluateGoal(
        { target: 60, deadline: "2026-01-01", setAt: BASE_DAY, baseline: 40 },
        { at: BASE_DAY + DAY_MS, score: 45 },
      ),
    ).toBeNull();
  });
});
