import { describe, expect, it } from "vitest";
import {
  ICPC_DURATIONS_S,
  icpcRemainingMs,
  icpcRoundEvents,
  icpcRoundStats,
  isIcpcRoundFinished,
  skipIcpcItem,
  startIcpcRound,
  submitIcpcAnswer,
  tickIcpcRound,
  touchIcpcRound,
} from "./round";

// T43 AC-3: 90 s ICPC round engine, stats and T22 icpc.score events.

describe("icpc round engine (AC-3)", () => {
  it("tracks timer, correct/wrong/skipped items, per-kind stats and emits icpc.score events", () => {
    expect(ICPC_DURATIONS_S).toContain(90);

    let round = startIcpcRound({
      durationMs: 90_000,
      seed: 17,
      kind: "all",
      compileErrorCounts: false,
    });
    expect(round.startedAt).toBeNull();
    expect(isIcpcRoundFinished(round)).toBe(false);
    expect(icpcRemainingMs(round, 0)).toBe(90_000);
    // Tick before start does nothing.
    expect(tickIcpcRound(round, 50_000)).toBe(round);

    // Touch starts clock once.
    round = touchIcpcRound(round, 1000);
    expect(round.startedAt).toBe(1000);
    expect(touchIcpcRound(round, 2000)).toBe(round);
    expect(icpcRemainingMs(round, 21_000)).toBe(70_000);

    // Correct answer on item 0.
    const item0 = round.current;
    round = submitIcpcAnswer(round, item0.canonical, 4000);
    expect(round.last?.ok).toBe(true);
    expect(round.last?.skipped).toBe(false);
    expect(round.last?.timeMs).toBe(3000);
    expect(round.current.index).toBe(1);

    // Wrong answer on item 1.
    round = submitIcpcAnswer(round, "errado-999", 9000);
    expect(round.last?.ok).toBe(false);
    expect(round.last?.skipped).toBe(false);
    expect(round.last?.reason.length).toBeGreaterThan(0);

    // Skip item 2.
    round = skipIcpcItem(round, 12_000);
    expect(round.last?.ok).toBe(false);
    expect(round.last?.skipped).toBe(true);

    // Tick before expiry keeps running.
    expect(tickIcpcRound(round, 50_000)).toBe(round);

    // Tick at expiry finishes round.
    round = tickIcpcRound(round, 91_000);
    expect(isIcpcRoundFinished(round)).toBe(true);
    expect(icpcRemainingMs(round, 95_000)).toBe(0);

    // Operations after finish are no-ops.
    expect(touchIcpcRound(round, 95_000)).toBe(round);
    expect(tickIcpcRound(round, 95_000)).toBe(round);
    expect(submitIcpcAnswer(round, "1", 95_000)).toBe(round);
    expect(skipIcpcItem(round, 95_000)).toBe(round);

    const stats = icpcRoundStats(round);
    expect(stats.correct).toBe(1);
    expect(stats.wrong).toBe(1);
    expect(stats.skipped).toBe(1);
    expect(stats.total).toBe(3);
    expect(stats.accuracy).toBeCloseTo(0.5);
    expect(stats.wrongItems).toHaveLength(1);
    expect(stats.byKind.reduce((s, row) => s + row.total, 0)).toBe(3);

    const at = Date.UTC(2026, 10, 26, 4);
    const events = icpcRoundEvents(round, at);
    expect(events).toHaveLength(3);
    expect(events.every((e) => e.drill === "icpc.score")).toBe(true);
    expect(events[0]?.kc).toBe(item0.kc);
    expect(events[0]?.ok).toBe(true);
    expect(events[0]?.extra).toEqual({
      seed: item0.seed,
      i: 0,
      kind: item0.kind,
      compileErrorCounts: false,
      skipped: false,
    });
    expect(events[2]?.extra["skipped"]).toBe(true);
  });

  it("handles empty round stats and expiry on submission", () => {
    const empty = startIcpcRound({
      durationMs: 60_000,
      seed: 5,
      kind: "penalidade",
      compileErrorCounts: true,
    });
    expect(icpcRoundStats(empty)).toEqual({
      correct: 0,
      wrong: 0,
      skipped: 0,
      total: 0,
      accuracy: 0,
      byKind: [],
      wrongItems: [],
    });

    const started = touchIcpcRound(empty, 0);
    const expired = submitIcpcAnswer(started, started.current.canonical, 60_000);
    expect(isIcpcRoundFinished(expired)).toBe(true);
    expect(expired.results).toHaveLength(1);
    const events = icpcRoundEvents(expired, 999);
    expect(events[0]?.config).toContain("ce");
    expect(events[0]?.extra["compileErrorCounts"]).toBe(true);
  });
});
