import { describe, expect, it } from "vitest";
import { WA_CLASSES } from "./classes";
import {
  WA_ROUND_SIZE,
  advanceAfterReview,
  isWaRoundFinished,
  skipWaItem,
  startWaRound,
  submitWaAnswer,
  touchWaRound,
  waElapsedMs,
  waRoundEvents,
  waRoundStats,
} from "./round";

// T41 AC-3 & AC-4: untimed 5-case round engine, stopwatch, post-answer review, per-class stats and wa.hunt events.

describe("wa round engine", () => {
  it("runs a 5-case untimed round with stopwatch, post-answer review, skips, per-class stats and wa.hunt events", () => {
    expect(WA_ROUND_SIZE).toBe(5);
    const r0 = startWaRound({ seed: 19, classes: WA_CLASSES });
    expect(r0.config.count).toBe(5);
    expect(r0.startedAt).toBeNull();
    expect(r0.finishedAt).toBeNull();
    expect(isWaRoundFinished(r0)).toBe(false);
    expect(waElapsedMs(r0, 5000)).toBe(0);

    // Touch starts the stopwatch.
    const r1 = touchWaRound(r0, 1000);
    expect(r1.startedAt).toBe(1000);
    expect(touchWaRound(r1, 2000)).toBe(r1);
    expect(waElapsedMs(r1, 4500)).toBe(3500);

    // Case 1: correct answer enters review so user sees breaking input, outputs and fix diff.
    const item0 = r1.current;
    const r1Rev = submitWaAnswer(
      r1,
      { line: item0.caseData.line, bugClass: item0.caseData.class },
      4000,
    );
    expect(r1Rev.reviewing).not.toBeNull();
    expect(r1Rev.reviewing?.ok).toBe(true);
    expect(r1Rev.results).toHaveLength(1);
    expect(r1Rev.current.index).toBe(0);
    // Submitting again while reviewing is ignored.
    expect(submitWaAnswer(r1Rev, { line: 1, bugClass: item0.caseData.class }, 4500)).toBe(r1Rev);

    // Advancing after review moves to case 2.
    const r2 = advanceAfterReview(r1Rev, 5000);
    expect(r2.reviewing).toBeNull();
    expect(r2.current.index).toBe(1);
    expect(advanceAfterReview(r2, 5500)).toBe(r2);

    // Case 2: wrong answer enters review with ok: false.
    const item1 = r2.current;
    const wrongClass = item1.choices.find((c) => c.id !== item1.caseData.class)!;
    const r2Rev = submitWaAnswer(r2, { line: item1.caseData.line, bugClass: wrongClass.id }, 9000);
    expect(r2Rev.reviewing?.ok).toBe(false);
    expect(r2Rev.reviewing?.lineOk).toBe(true);
    expect(r2Rev.reviewing?.classOk).toBe(false);
    // Skipping while reviewing advances like advanceAfterReview.
    const r3 = skipWaItem(r2Rev, 10_000);
    expect(r3.reviewing).toBeNull();
    expect(r3.current.index).toBe(2);

    // Case 3: skipped immediately.
    const r4 = skipWaItem(r3, 12_000);
    expect(r4.reviewing).toBeNull();
    expect(r4.last?.skipped).toBe(true);
    expect(r4.current.index).toBe(3);

    // Case 4: correct + advance.
    const item3 = r4.current;
    const r4Rev = submitWaAnswer(
      r4,
      { line: item3.caseData.line, bugClass: item3.caseData.class },
      16_000,
    );
    const r5 = advanceAfterReview(r4Rev, 17_000);
    expect(r5.current.index).toBe(4);
    expect(isWaRoundFinished(r5)).toBe(false);

    // Case 5: correct stays in review until advanceAfterReview, then finishes.
    const item4 = r5.current;
    const r5Rev = submitWaAnswer(
      r5,
      { line: item4.caseData.line, bugClass: item4.caseData.class },
      21_000,
    );
    expect(isWaRoundFinished(r5Rev)).toBe(false);
    expect(r5Rev.reviewing?.ok).toBe(true);
    expect(r5Rev.results).toHaveLength(5);

    const done = advanceAfterReview(r5Rev, 23_000);
    expect(isWaRoundFinished(done)).toBe(true);
    expect(done.reviewing).toBeNull();
    expect(done.finishedAt).toBe(23_000);
    expect(waElapsedMs(done, 99_000)).toBe(22_000);
    expect(touchWaRound(done, 30_000)).toBe(done);
    expect(submitWaAnswer(done, { line: 1, bugClass: item0.caseData.class }, 30_000)).toBe(done);
    expect(advanceAfterReview(done, 30_000)).toBe(done);
    expect(skipWaItem(done, 30_000)).toBe(done);

    const stats = waRoundStats(done);
    expect(stats.correct).toBe(3);
    expect(stats.wrong).toBe(1);
    expect(stats.skipped).toBe(1);
    expect(stats.total).toBe(5);
    expect(stats.accuracy).toBe(0.75);
    expect(stats.avgTimeMs).toBeGreaterThan(0);
    expect(stats.wrongItems).toHaveLength(1);
    expect(stats.byClass.reduce((acc, row) => acc + row.total, 0)).toBe(5);

    const at = Date.UTC(2026, 10, 26, 5);
    const events = waRoundEvents(done, at);
    expect(events).toHaveLength(5);
    expect(events.every((e) => e.drill === "wa.hunt")).toBe(true);
    expect(events[0]?.kc).toBe(`wa.${item0.bugClass}`);
    expect(events[0]?.ok).toBe(true);
    expect(events[1]?.ok).toBe(false);
    expect(events[2]?.extra["skipped"]).toBe(true);
  });

  it("handles empty stats, repeated class aggregation and finishing by skipping the last case", () => {
    const empty = startWaRound({ seed: 7, classes: ["overflow"], count: 2 });
    expect(waRoundStats(empty)).toEqual({
      correct: 0,
      wrong: 0,
      skipped: 0,
      total: 0,
      accuracy: 0,
      avgTimeMs: 0,
      byClass: [],
      wrongItems: [],
    });

    // Submit directly without prior touch, then skip the 2nd (last) case to finish immediately.
    const item0 = empty.current;
    const rev0 = submitWaAnswer(
      empty,
      { line: item0.caseData.line, bugClass: item0.caseData.class },
      1000,
    );
    expect(rev0.startedAt).toBe(1000);
    const r1 = advanceAfterReview(rev0, 2000);
    const done = skipWaItem(r1, 5000);
    expect(isWaRoundFinished(done)).toBe(true);
    expect(done.finishedAt).toBe(5000);
    expect(waElapsedMs(done, 8000)).toBe(4000);

    const stats = waRoundStats(done);
    expect(stats.byClass).toHaveLength(1);
    expect(stats.byClass[0]?.bugClass).toBe("overflow");
    expect(stats.byClass[0]?.total).toBe(2);
    expect(stats.byClass[0]?.correct).toBe(1);
  });
});
