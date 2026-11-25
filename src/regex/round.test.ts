import { describe, expect, it } from "vitest";
import {
  advanceSkippedRegexItem,
  isRegexRoundFinished,
  recordRegexAttempt,
  REGEX_ROUND_LENGTH,
  regexElapsedMs,
  regexPracticeEvents,
  regexRoundStats,
  revealSkipRegexItem,
  startRegexRound,
  touchRegexRound,
} from "./round";
import { REGEX_ITEM_KINDS } from "./types";

// T45 AC-5: 5-item regex practice round with stopwatch, per-item attempts/time,
// two-step skip reveal, and T22 regex.practice events.

describe("regex round", () => {
  it("runs 5 items, tracks per-item attempts and time, and emits T22 events", () => {
    let round = startRegexRound({ seed: 19, dialect: "python", kinds: REGEX_ITEM_KINDS });
    expect(round.items).toHaveLength(REGEX_ROUND_LENGTH);
    expect(REGEX_ROUND_LENGTH).toBe(5);
    expect(isRegexRoundFinished(round)).toBe(false);
    expect(regexElapsedMs(round, 1000)).toBe(0);

    // Start stopwatch on first interaction.
    round = touchRegexRound(round, 1000);
    expect(regexElapsedMs(round, 2500)).toBe(1500);

    // Item 0: one wrong attempt, then correct.
    round = recordRegexAttempt(round, false, 2000);
    expect(round.index).toBe(0);
    expect(round.currentAttempts).toBe(1);
    round = recordRegexAttempt(round, true, 3000);
    expect(round.index).toBe(1);
    expect(round.records[0]).toMatchObject({ ok: true, skipped: false, attempts: 2, timeMs: 2000 });

    // Item 1: skip reveals canonical first, then advances.
    round = revealSkipRegexItem(round, 4500);
    expect(round.index).toBe(1);
    expect(round.skippedCurrent).toBe(true);
    round = advanceSkippedRegexItem(round, 5000);
    expect(round.index).toBe(2);
    expect(round.records[1]).toMatchObject({ ok: false, skipped: true, timeMs: 1500 });

    // Items 2, 3, 4: solved on first try.
    round = recordRegexAttempt(round, true, 7000);
    round = recordRegexAttempt(round, true, 8500);
    round = recordRegexAttempt(round, true, 10000);

    expect(isRegexRoundFinished(round)).toBe(true);
    const stats = regexRoundStats(round);
    expect(stats.correct).toBe(4);
    expect(stats.skipped).toBe(1);
    expect(stats.totalAttempts).toBe(5);
    expect(stats.totalTimeMs).toBe(9000);

    const at = Date.UTC(2026, 10, 25, 3);
    const events = regexPracticeEvents(round, at);
    expect(events).toHaveLength(5);
    expect(events.every((e) => e.drill === "regex.practice")).toBe(true);
    expect(events.every((e) => e.config === "python")).toBe(true);
    expect(events[0]?.kc).toBe(round.items[0]?.kc);
    expect(events[1]?.ok).toBe(false);
    expect(events[1]?.extra["skipped"]).toBe(true);
  });
});
