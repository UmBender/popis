import { describe, expect, it } from "vitest";
import {
  isStlRoundFinished,
  skipStlItem,
  startStlRound,
  STL_DURATIONS_S,
  stlOutputEvents,
  stlRemainingMs,
  stlRoundStats,
  submitStlAnswer,
  tickStlRound,
  touchStlRound,
} from "./round";

// T42 AC-5: STL timed round engine, stats and T22 stl.out events.

describe("stl round engine (AC-5)", () => {
  it("tracks timer, correct/wrong/skipped items, per-model stats and emits stl.out events", () => {
    expect(STL_DURATIONS_S).toContain(120);
    let round = startStlRound({ durationMs: 120_000, seed: 42, level: 2 });
    expect(isStlRoundFinished(round)).toBe(false);
    expect(stlRemainingMs(round, 0)).toBe(120_000);
    expect(tickStlRound(round, 5_000)).toBe(round);

    round = touchStlRound(round, 1_000);
    expect(touchStlRound(round, 2_000)).toBe(round);
    expect(stlRemainingMs(round, 11_000)).toBe(110_000);

    const first = round.current;
    round = submitStlAnswer(round, ` ${first.canonical} \n`, 3_000);
    expect(round.last?.ok).toBe(true);
    expect(round.last?.timeMs).toBe(2_000);

    round = submitStlAnswer(round, "resposta-errada", 6_000);
    expect(round.last?.ok).toBe(false);
    expect(round.last?.skipped).toBe(false);
    expect(round.last?.explanation).toBeTruthy();

    round = skipStlItem(round, 8_000);
    expect(round.last?.skipped).toBe(true);

    round = tickStlRound(round, 121_000);
    expect(isStlRoundFinished(round)).toBe(true);
    expect(stlRemainingMs(round, 130_000)).toBe(0);
    // Operations after finish are no-ops.
    expect(submitStlAnswer(round, "0", 130_000)).toBe(round);
    expect(skipStlItem(round, 130_000)).toBe(round);
    expect(tickStlRound(round, 130_000)).toBe(round);
    expect(touchStlRound(round, 130_000)).toBe(round);

    const stats = stlRoundStats(round);
    expect(stats.correct).toBe(1);
    expect(stats.wrong).toBe(1);
    expect(stats.skipped).toBe(1);
    expect(stats.total).toBe(3);
    expect(stats.accuracy).toBe(0.5);
    expect(stats.wrongItems).toHaveLength(1);
    expect(stats.byModel.length).toBeGreaterThanOrEqual(1);

    const at = Date.UTC(2026, 10, 24, 12);
    const events = stlOutputEvents(round, at);
    expect(events).toHaveLength(3);
    expect(events.every((e) => e.drill === "stl.out")).toBe(true);
    expect(events[0]?.config).toBe("stl-L2");
    expect(events[0]?.kc).toBe(first.kc);
    expect(events[0]?.ok).toBe(true);
    expect(events[1]?.ok).toBe(false);
    expect(events[2]?.extra["skipped"]).toBe(true);
  });

  it("finishes immediately when submission occurs at or after durationMs", () => {
    let round = startStlRound({ durationMs: 30_000, seed: 7, level: 1 });
    round = touchStlRound(round, 0);
    round = submitStlAnswer(round, round.current.canonical, 30_000);
    expect(isStlRoundFinished(round)).toBe(true);
    expect(stlRoundStats(round).accuracy).toBe(1);
  });
});
