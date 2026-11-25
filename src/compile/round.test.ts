import { describe, expect, it } from "vitest";
import { COMPILE_GROUPS } from "./causes";
import {
  COMPILE_DURATIONS_S,
  advanceAfterReview,
  compileRemainingMs,
  compileRoundEvents,
  compileRoundStats,
  isCompileRoundFinished,
  skipCompileItem,
  startCompileRound,
  submitCompileAnswer,
  tickCompileRound,
  touchCompileRound,
} from "./round";

// T40 AC-2 & AC-4: 90 s round engine, wrong-answer review state, per-group stats and compile.read events.

describe("compile round engine", () => {
  it("tracks 90 s timer, wrong review state, skips, per-group stats and emits compile.read events", () => {
    expect(COMPILE_DURATIONS_S).toEqual([60, 90, 120]);
    const r0 = startCompileRound({
      durationMs: 90_000,
      seed: 17,
      groups: COMPILE_GROUPS,
    });

    expect(r0.startedAt).toBeNull();
    expect(isCompileRoundFinished(r0)).toBe(false);
    expect(compileRemainingMs(r0, 5000)).toBe(90_000);
    expect(tickCompileRound(r0, 100_000)).toBe(r0);

    // Touch starts the clock.
    const r1 = touchCompileRound(r0, 1000);
    expect(r1.startedAt).toBe(1000);
    expect(touchCompileRound(r1, 2000)).toBe(r1);
    expect(compileRemainingMs(r1, 11_000)).toBe(80_000);

    // Correct answer advances immediately.
    const item0 = r1.current;
    const r2 = submitCompileAnswer(
      r1,
      { line: item0.caseData.line, cause: item0.caseData.cause },
      4000,
    );
    expect(r2.reviewing).toBeNull();
    expect(r2.last?.ok).toBe(true);
    expect(r2.results).toHaveLength(1);
    expect(r2.current.index).toBe(1);

    // Wrong answer keeps the current item in review mode with explanation.
    const item1 = r2.current;
    const wrongCause = item1.choices.find((c) => c.id !== item1.caseData.cause)!;
    const r3 = submitCompileAnswer(r2, { line: item1.caseData.line, cause: wrongCause.id }, 9000);
    expect(r3.reviewing).not.toBeNull();
    expect(r3.reviewing?.ok).toBe(false);
    expect(r3.reviewing?.explanation).toBe(item1.caseData.explanation);
    expect(r3.current.caseData.id).toBe(item1.caseData.id);
    // Submitting again while reviewing is ignored.
    expect(submitCompileAnswer(r3, { line: 1, cause: wrongCause.id }, 9500)).toBe(r3);

    // Advancing after review moves to item 2.
    const r4 = advanceAfterReview(r3, 12_000);
    expect(r4.reviewing).toBeNull();
    expect(r4.current.index).toBe(2);
    // Advancing when not reviewing is a no-op.
    expect(advanceAfterReview(r4, 12_500)).toBe(r4);

    // Skipping advances immediately and marks skipped.
    const r5 = skipCompileItem(r4, 15_000);
    expect(r5.last?.skipped).toBe(true);
    expect(r5.current.index).toBe(3);

    // Tick before expiry keeps running; tick at expiry finishes the round.
    expect(tickCompileRound(r5, 90_999)).toBe(r5);
    const done = tickCompileRound(r5, 91_000);
    expect(isCompileRoundFinished(done)).toBe(true);
    expect(compileRemainingMs(done, 92_000)).toBe(0);
    expect(touchCompileRound(done, 92_000)).toBe(done);
    expect(submitCompileAnswer(done, { line: 1, cause: item0.caseData.cause }, 92_000)).toBe(done);
    expect(skipCompileItem(done, 92_000)).toBe(done);

    const stats = compileRoundStats(done);
    expect(stats.correct).toBe(1);
    expect(stats.wrong).toBe(1);
    expect(stats.skipped).toBe(1);
    expect(stats.total).toBe(3);
    expect(stats.accuracy).toBe(0.5);
    expect(stats.wrongItems).toHaveLength(1);
    expect(stats.byGroup.reduce((sum, row) => sum + row.total, 0)).toBe(3);

    const at = Date.UTC(2026, 10, 25, 0);
    const events = compileRoundEvents(done, at);
    expect(events).toHaveLength(3);
    expect(events.every((e) => e.drill === "compile.read")).toBe(true);
    expect(events[0]?.kc).toBe(`compile.${item0.group}`);
    expect(events[0]?.ok).toBe(true);
    expect(events[1]?.ok).toBe(false);
    expect(events[2]?.extra["skipped"]).toBe(true);
  });

  it("handles empty stats and expiry on submit or advance", () => {
    const empty = startCompileRound({ durationMs: 60_000, seed: 5, groups: ["asan"] });
    expect(compileRoundStats(empty)).toEqual({
      correct: 0,
      wrong: 0,
      skipped: 0,
      total: 0,
      accuracy: 0,
      byGroup: [],
      wrongItems: [],
    });

    const item0 = empty.current;
    const wrongCause = item0.choices.find((c) => c.id !== item0.caseData.cause)!;
    const started = touchCompileRound(empty, 0);
    const reviewing = submitCompileAnswer(started, { line: 1, cause: wrongCause.id }, 55_000);
    const finishedOnAdvance = advanceAfterReview(reviewing, 65_000);
    expect(isCompileRoundFinished(finishedOnAdvance)).toBe(true);
    expect(advanceAfterReview(finishedOnAdvance, 70_000)).toBe(finishedOnAdvance);

    // Skipping while reviewing advances to the next item.
    const skippedReview = skipCompileItem(reviewing, 56_000);
    expect(skippedReview.reviewing).toBeNull();
    expect(skippedReview.current.index).toBe(1);

    // Submitting at or past the deadline finishes immediately (both ok and wrong).
    const okExpired = submitCompileAnswer(
      started,
      { line: item0.caseData.line, cause: item0.caseData.cause },
      61_000,
    );
    expect(isCompileRoundFinished(okExpired)).toBe(true);
    expect(okExpired.results).toHaveLength(1);

    const wrongExpired = submitCompileAnswer(started, { line: 1, cause: wrongCause.id }, 61_000);
    expect(isCompileRoundFinished(wrongExpired)).toBe(true);
    expect(wrongExpired.reviewing).toBeNull();

    // Multiple items in the same group aggregate in byGroup.
    const r2 = submitCompileAnswer(
      started,
      { line: item0.caseData.line, cause: item0.caseData.cause },
      2000,
    );
    const item1 = r2.current;
    const r3 = submitCompileAnswer(
      r2,
      { line: item1.caseData.line, cause: item1.caseData.cause },
      5000,
    );
    const stats = compileRoundStats(r3);
    expect(stats.byGroup).toHaveLength(1);
    expect(stats.byGroup[0]?.correct).toBe(2);
    expect(stats.byGroup[0]?.total).toBe(2);
  });
});
