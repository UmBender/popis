import { describe, expect, it } from "vitest";
import {
  gdbCommandEvents,
  gdbRemainingMs,
  gdbRoundStats,
  isGdbRoundFinished,
  skipGdbItem,
  startGdbRound,
  submitGdbCommand,
  tickGdbRound,
  touchGdbRound,
} from "./round";

// T25 AC-5: pure gdb command drill round engine, scoring, timer and event emission.

describe("gdb command round engine", () => {
  it("tracks correct aliases, wrong answers with canonical form, skips, and ends at durationMs", () => {
    let round = startGdbRound({
      durationMs: 60_000,
      seed: 17,
      kinds: ["break-linha", "andar"],
    });
    expect(round.startedAt).toBeNull();
    expect(isGdbRoundFinished(round)).toBe(false);
    expect(gdbRemainingMs(round, 0)).toBe(60_000);

    // First input starts the timer.
    round = touchGdbRound(round, 1000);
    expect(round.startedAt).toBe(1000);

    // Correct answer on item 0.
    const firstCanonical = round.current.canonical;
    round = submitGdbCommand(round, firstCanonical, 3000);
    expect(round.results).toHaveLength(1);
    expect(round.results[0]?.ok).toBe(true);
    expect(round.results[0]?.timeMs).toBe(2000);
    expect(round.last?.ok).toBe(true);

    // Wrong answer on item 1 records canonical + reason and advances.
    const secondCanonical = round.current.canonical;
    round = submitGdbCommand(round, "zzz", 5500);
    expect(round.results).toHaveLength(2);
    expect(round.results[1]?.ok).toBe(false);
    expect(round.results[1]?.canonical).toBe(secondCanonical);
    expect(round.last?.ok).toBe(false);
    expect(round.last?.canonical).toBe(secondCanonical);
    expect(round.last?.reason.length).toBeGreaterThan(0);

    // Skip on item 2.
    round = skipGdbItem(round, 7000);
    expect(round.results).toHaveLength(3);
    expect(round.results[2]?.skipped).toBe(true);

    // Timer expires at 61_000.
    round = tickGdbRound(round, 61_000);
    expect(isGdbRoundFinished(round)).toBe(true);
    expect(gdbRemainingMs(round, 61_000)).toBe(0);

    const stats = gdbRoundStats(round);
    expect(stats.correct).toBe(1);
    expect(stats.wrong).toBe(1);
    expect(stats.skipped).toBe(1);
    expect(stats.wrongItems).toHaveLength(1);
    expect(stats.byKind.length).toBeGreaterThanOrEqual(1);

    const events = gdbCommandEvents(round, 999_000);
    expect(events).toHaveLength(3);
    expect(events.every((e) => e.drill === "gdb.cmd")).toBe(true);
    expect(events[0]?.ok).toBe(true);
    expect(events[1]?.ok).toBe(false);
  });
});
