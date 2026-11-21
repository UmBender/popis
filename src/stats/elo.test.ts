import { describe, expect, it } from "vitest";
import { createRng } from "../core/rng";
import { DEFAULT_ARITHMETIC } from "../gen/arithmetic";
import type { TrainingEvent } from "./event";
import { DAY_MS } from "./summary";
import {
  arithmeticForLevel,
  AUTO_LEVEL_DRILLS,
  chooseNextLevel,
  DEFAULT_TARGET_ACCURACY,
  defaultLevelRatings,
  drillLevelCount,
  estimationForLevel,
  expectedWin,
  INITIAL_ELO,
  isEloWin,
  kcTargetTimeMs,
  kFactor,
  levelOfArithmetic,
  levelOfEstimation,
  levelOfSums,
  replayElo,
  sumsForLevel,
  updateElo,
} from "./elo";

const NOW = Date.UTC(2026, 10, 21, 12, 0, 0);

function ev(
  kc: string,
  ok: boolean,
  timeMs: number,
  at = NOW,
  config = "L1",
  i = 0,
): TrainingEvent {
  return {
    at,
    drill: "vim.motion",
    config,
    kc,
    ok,
    timeMs,
    extra: { seed: 1, i },
  };
}

describe("elo rating system (AC-1)", () => {
  it("kFactor decreases monotonically with the number of responses", () => {
    const ks = [0, 1, 5, 10, 20, 50, 100].map(kFactor);
    for (let i = 1; i < ks.length; i++) {
      expect(ks[i]).toBeLessThan(ks[i - 1] as number);
      expect(ks[i]).toBeGreaterThan(0);
    }
  });

  it("expectedWin is 0.5 at equal ratings and increases with user advantage", () => {
    expect(expectedWin(1000, 1000)).toBeCloseTo(0.5, 6);
    expect(expectedWin(1400, 1000)).toBeCloseTo(10 / 11, 6);
    expect(expectedWin(1000, 1400)).toBeCloseTo(1 / 11, 6);
  });

  it("kcTargetTimeMs computes the median of correct times within the last 2 weeks", () => {
    const events = [
      // Too old (> 14 days): ignored
      ev("f", true, 9000, NOW - 20 * DAY_MS, "L4", 0),
      // Wrong answer inside window: ignored
      ev("f", false, 500, NOW - 2 * DAY_MS, "L4", 1),
      // Other KC: ignored
      ev("w", true, 400, NOW - 2 * DAY_MS, "L2", 2),
      // Three correct answers inside 2-week window: 1000, 1400, 2200 -> median 1400
      ev("f", true, 1000, NOW - 10 * DAY_MS, "L4", 3),
      ev("f", true, 2200, NOW - 5 * DAY_MS, "L4", 4),
      ev("f", true, 1400, NOW - 1 * DAY_MS, "L4", 5),
    ];
    expect(kcTargetTimeMs(events, "f", NOW)).toBe(1400);
    expect(kcTargetTimeMs(events, "missing", NOW)).toBeNull();
  });

  it("isEloWin requires a correct answer within the KC target time", () => {
    expect(isEloWin({ ok: true, timeMs: 1200 }, 1400)).toBe(true);
    expect(isEloWin({ ok: true, timeMs: 1400 }, 1400)).toBe(true);
    expect(isEloWin({ ok: true, timeMs: 1401 }, 1400)).toBe(false);
    expect(isEloWin({ ok: false, timeMs: 500 }, 1400)).toBe(false);
    expect(isEloWin({ ok: true, timeMs: 5000 }, null)).toBe(true);
    expect(isEloWin({ ok: false, timeMs: 500 }, null)).toBe(false);
  });

  it("updateElo raises user rating on win, lowers on loss, and keeps zero sum", () => {
    const startUser = { rating: INITIAL_ELO, count: 0 };
    const startItem = { rating: INITIAL_ELO, count: 0 };
    const win = updateElo(startUser, startItem, true);
    expect(win.deltaUser).toBeGreaterThan(0);
    expect(win.deltaUser + win.deltaItem).toBeCloseTo(0, 10);
    expect(win.user.count).toBe(1);
    expect(win.item.count).toBe(1);

    const loss = updateElo(startUser, startItem, false);
    expect(loss.deltaUser).toBeLessThan(0);
    expect(loss.deltaUser + loss.deltaItem).toBeCloseTo(0, 10);
  });

  it("replayElo recovers the true skill ordering on simulated data with known abilities", () => {
    const rng = createRng(42);
    const trueSkills = [
      { kc: "kc.weak", rating: 750 },
      { kc: "kc.mid", rating: 1000 },
      { kc: "kc.strong", rating: 1250 },
      { kc: "kc.expert", rating: 1500 },
    ] as const;
    const levels = [850, 1000, 1150, 1300];
    const events: TrainingEvent[] = [];
    let i = 0;
    for (let trial = 0; trial < 200; trial++) {
      for (const s of trueSkills) {
        const lvlIdx = trial % levels.length;
        const itemRating = levels[lvlIdx] as number;
        const pWin = expectedWin(s.rating, itemRating);
        const ok = rng.next() < pWin;
        events.push(
          ev(
            s.kc,
            ok,
            1000,
            NOW - (200 - trial) * 1000,
            `L${String(lvlIdx + 1)}`,
            i++,
          ),
        );
      }
    }
    const state = replayElo(events, NOW);
    const estimated = trueSkills.map((s) => state.users[s.kc]?.rating ?? 0);
    for (let k = 1; k < estimated.length; k++) {
      expect(estimated[k]).toBeGreaterThan(estimated[k - 1] as number);
    }
  });
});

describe("automatic difficulty selection (AC-2)", () => {
  it("chooseNextLevel moves at most one level per round and targets 85% by default", () => {
    const ratings = defaultLevelRatings(7);
    expect(DEFAULT_TARGET_ACCURACY).toBe(0.85);
    // Very high user rating at level 1 can only step up to level 2.
    expect(
      chooseNextLevel({ currentLevel: 1, userRating: 2000, levelRatings: ratings }),
    ).toBe(2);
    // Very low user rating at level 7 can only step down to level 6.
    expect(
      chooseNextLevel({ currentLevel: 7, userRating: 200, levelRatings: ratings }),
    ).toBe(6);
    // Stays within bounds at edges.
    expect(
      chooseNextLevel({ currentLevel: 1, userRating: 200, levelRatings: ratings }),
    ).toBe(1);
    expect(
      chooseNextLevel({ currentLevel: 7, userRating: 2500, levelRatings: ratings }),
    ).toBe(7);
  });

  it.each([0.7, 0.85, 0.95])(
    "simulation converges empirical accuracy to target %s within ±5 percentage points",
    (target) => {
      const rng = createRng(Math.round(target * 1000));
      const trueSkill = 1220;
      const trueLevels = Array.from({ length: 12 }, (_, idx) => 550 + idx * 75);
      let user = { rating: INITIAL_ELO, count: 0 };
      const items = trueLevels.map((r) => ({ rating: r, count: 0 }));
      let level = 1;
      const rounds = 80;
      const itemsPerRound = 15;
      let steadyWins = 0;
      let steadyTotal = 0;

      for (let r = 0; r < rounds; r++) {
        const prev = level;
        level = chooseNextLevel({
          currentLevel: level,
          userRating: user.rating,
          levelRatings: items.map((it) => it.rating),
          targetAccuracy: target,
        });
        expect(Math.abs(level - prev)).toBeLessThanOrEqual(1);

        const idx = level - 1;
        const trueP = expectedWin(trueSkill, trueLevels[idx] as number);
        for (let k = 0; k < itemsPerRound; k++) {
          const win = rng.next() < trueP;
          const res = updateElo(user, items[idx] as { rating: number; count: number }, win);
          user = res.user;
          items[idx] = res.item;
          if (r >= 25) {
            if (win) steadyWins++;
            steadyTotal++;
          }
        }
      }

      const empirical = steadyWins / steadyTotal;
      expect(Math.abs(empirical - target)).toBeLessThanOrEqual(0.05);
    },
  );

  it("maps auto-level presets cleanly for arithmetic, estimation, sums and vim-motion", () => {
    expect(AUTO_LEVEL_DRILLS).toEqual(["vim-motion", "arithmetic", "estimation", "sums"]);
    expect(drillLevelCount("vim-motion")).toBe(7);
    expect(drillLevelCount("arithmetic")).toBe(5);
    expect(drillLevelCount("estimation")).toBe(3);
    expect(drillLevelCount("sums")).toBe(2);

    const a1 = arithmeticForLevel(1, DEFAULT_ARITHMETIC);
    const a5 = arithmeticForLevel(5, DEFAULT_ARITHMETIC);
    expect(a1.operations).toEqual(DEFAULT_ARITHMETIC.operations);
    expect(a1.addLeft.max).toBeLessThan(a5.addLeft.max);
    expect(levelOfArithmetic(a1)).toBe(1);
    expect(levelOfArithmetic(DEFAULT_ARITHMETIC)).toBe(4);
    expect(levelOfArithmetic(a5)).toBe(5);

    expect(levelOfEstimation(estimationForLevel(1))).toBe(1);
    expect(levelOfEstimation(estimationForLevel(2))).toBe(2);
    expect(levelOfEstimation(estimationForLevel(3))).toBe(3);

    expect(levelOfSums(sumsForLevel(1))).toBe(1);
    expect(levelOfSums(sumsForLevel(2))).toBe(2);
  });
});
