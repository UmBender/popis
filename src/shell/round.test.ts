import { describe, expect, it } from "vitest";
import { SHELL_DRILL_KINDS } from "./drill";
import {
  isShellRoundFinished,
  SHELL_DURATIONS_S,
  shellCommandEvents,
  shellRemainingMs,
  shellRoundStats,
  skipShellItem,
  startShellRound,
  submitShellCommand,
  tickShellRound,
  touchShellRound,
} from "./round";

// T39 AC-5: Shell Comandos timed round engine, stats and T22 event emission.

describe("shell round engine (AC-5)", () => {
  it("tracks timing, correct/wrong/skipped items, stats and emits shell.cmd events", () => {
    expect(SHELL_DURATIONS_S).toContain(60);
    let round = startShellRound({
      durationMs: 60_000,
      seed: 19,
      kinds: ["compilar", "rodar"],
    });
    expect(isShellRoundFinished(round)).toBe(false);
    expect(shellRemainingMs(round, 1000)).toBe(60_000);

    // Tick before first keystroke does not start or finish the round.
    round = tickShellRound(round, 100_000);
    expect(round.startedAt).toBeNull();

    // First keystroke starts the timer; second touch is a no-op.
    round = touchShellRound(round, 5000);
    expect(round.startedAt).toBe(5000);
    expect(touchShellRound(round, 9000)).toBe(round);
    expect(shellRemainingMs(round, 20_000)).toBe(45_000);

    // Submit canonical -> correct.
    const item0 = round.current;
    round = submitShellCommand(round, item0.canonical, 7000);
    expect(round.last?.ok).toBe(true);
    expect(round.last?.timeMs).toBe(2000);

    // Submit wrong command -> wrong with reason.
    round = submitShellCommand(round, "echo errado", 10_000);
    expect(round.last?.ok).toBe(false);
    expect(round.last?.skipped).toBe(false);
    expect(round.last?.reason.length).toBeGreaterThan(3);

    // Skip an item.
    round = skipShellItem(round, 12_000);
    expect(round.last?.skipped).toBe(true);

    // Tick past duration finishes the round; further submits/skips/ticks are ignored.
    round = tickShellRound(round, 66_000);
    expect(isShellRoundFinished(round)).toBe(true);
    expect(shellRemainingMs(round, 70_000)).toBe(0);
    expect(submitShellCommand(round, "ls", 70_000)).toBe(round);
    expect(skipShellItem(round, 70_000)).toBe(round);
    expect(tickShellRound(round, 70_000)).toBe(round);

    const stats = shellRoundStats(round);
    expect(stats.correct).toBe(1);
    expect(stats.wrong).toBe(1);
    expect(stats.skipped).toBe(1);
    expect(stats.total).toBe(3);
    expect(stats.accuracy).toBeCloseTo(0.5);
    expect(stats.wrongItems).toHaveLength(1);
    expect(stats.byKind.length).toBeGreaterThanOrEqual(1);

    const events = shellCommandEvents(round, 99_999);
    expect(events).toHaveLength(3);
    expect(events.every((e) => e.drill === "shell.cmd")).toBe(true);
    expect(events[0]?.kc).toBe(item0.kc);
    expect(events[0]?.ok).toBe(true);
    expect(events[2]?.extra["skipped"]).toBe(true);
  });

  it("finishes immediately if a submission lands at or after the duration limit", () => {
    let round = startShellRound({ durationMs: 30_000, seed: 5, kinds: SHELL_DRILL_KINDS });
    round = touchShellRound(round, 1000);
    round = submitShellCommand(round, round.current.canonical, 31_000);
    expect(isShellRoundFinished(round)).toBe(true);
    expect(shellRoundStats(round).correct).toBe(1);
  });
});
