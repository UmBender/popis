import { describe, expect, it } from "vitest";
import { GDB_OUT_KINDS } from "./out-drill";
import {
  gdbOutRemainingMs,
  gdbOutRoundStats,
  gdbOutputEvents,
  isGdbOutRoundFinished,
  skipGdbOutItem,
  startGdbOutRound,
  submitGdbOutput,
  tickGdbOutRound,
  touchGdbOutRound,
} from "./out-round";

// T26 AC-7: GDB Saída timed round engine, stats and T22 gdb.out events.

describe("gdb output round engine (AC-7)", () => {
  it("tracks timer, correct/wrong/skipped items, per-kind stats and emits gdb.out events", () => {
    let round = startGdbOutRound({
      durationMs: 60_000,
      seed: 19,
      level: 2,
      kinds: ["formato", "sizeof"],
    });

    expect(isGdbOutRoundFinished(round)).toBe(false);
    expect(gdbOutRemainingMs(round, 500)).toBe(60_000);
    expect(tickGdbOutRound(round, 1000)).toBe(round);

    round = touchGdbOutRound(round, 1000);
    expect(touchGdbOutRound(round, 1200)).toBe(round);
    expect(gdbOutRemainingMs(round, 15_000)).toBe(46_000);

    // Submit canonical answer with $1 = prefix -> correct.
    const item0 = round.current;
    round = submitGdbOutput(round, `$1 = ${item0.canonical}`, 4000);
    expect(round.last?.ok).toBe(true);
    expect(round.results).toHaveLength(1);

    // Submit wrong answer -> wrong with reason.
    round = submitGdbOutput(round, "wrong-value", 7500);
    expect(round.last?.ok).toBe(false);
    expect(round.last?.skipped).toBe(false);
    expect(round.last?.reason.length).toBeGreaterThan(5);

    // Skip an item.
    round = skipGdbOutItem(round, 9000);
    expect(round.last?.skipped).toBe(true);
    expect(round.last?.ok).toBe(false);

    // Tick before expiry keeps round running; tick at expiry finishes it.
    expect(tickGdbOutRound(round, 59_000)).toBe(round);
    round = tickGdbOutRound(round, 61_000);
    expect(isGdbOutRoundFinished(round)).toBe(true);
    expect(gdbOutRemainingMs(round, 62_000)).toBe(0);

    // Further actions after finish are no-ops.
    expect(touchGdbOutRound(round, 62_000)).toBe(round);
    expect(submitGdbOutput(round, "0", 62_000)).toBe(round);
    expect(skipGdbOutItem(round, 62_000)).toBe(round);
    expect(tickGdbOutRound(round, 62_000)).toBe(round);

    const stats = gdbOutRoundStats(round);
    expect(stats.correct).toBe(1);
    expect(stats.wrong).toBe(1);
    expect(stats.skipped).toBe(1);
    expect(stats.total).toBe(3);
    expect(stats.accuracy).toBeCloseTo(0.5);
    expect(stats.wrongItems).toHaveLength(1);
    expect(stats.byKind.length).toBeGreaterThanOrEqual(1);

    const at = Date.UTC(2026, 10, 22, 3);
    const events = gdbOutputEvents(round, at);
    expect(events).toHaveLength(3);
    expect(events.every((e) => e.drill === "gdb.out")).toBe(true);
    expect(events[0]?.config).toBe("out-L2");
    expect(events[0]?.kc).toBe(item0.kc);
    expect(events[0]?.ok).toBe(true);
    expect(events[1]?.ok).toBe(false);
    expect(events[2]?.extra["skipped"]).toBe(true);
  });

  it("finishes immediately if submission arrives at or past durationMs and handles empty stats", () => {
    const empty = startGdbOutRound({
      durationMs: 30_000,
      seed: 3,
      level: 1,
      kinds: GDB_OUT_KINDS,
    });
    expect(gdbOutRoundStats(empty).accuracy).toBe(0);

    let r = touchGdbOutRound(empty, 0);
    r = submitGdbOutput(r, r.current.canonical, 30_000);
    expect(r.finished).toBe(true);
    expect(r.results).toHaveLength(1);
  });
});
