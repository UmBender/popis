// Bug: a typist at ~70 WPM with 97% accuracy kept a pace target stuck at
// 39 WPM, because every word with a (corrected) typo counted as off pace
// and capped the on-pace share near 89%, below what the rule asks to rise.
// Only right, complete words should count, and a target far below the
// round's goal speed should catch up at once instead of 2 WPM a round.
import { describe, expect, it } from "vitest";
import { evaluatePaceRound } from "../../src/typing/pace";

/** 66 right words from 55 to 90 WPM, then 8 fast words with a typo. */
function round() {
  const right = Array.from({ length: 66 }, (_, i) => {
    const wpm = 55 + (35 * i) / 65;
    return { ok: true, complete: true, chars: 5, timeMs: (5 * 12_000) / wpm };
  });
  const typos = Array.from({ length: 8 }, () => ({
    ok: false,
    complete: true,
    chars: 5,
    timeMs: (5 * 12_000) / 70,
  }));
  return [...right, ...typos];
}

describe("regression T52 pace-target-stuck", () => {
  it("typist at 70 wpm with 97% accuracy lifts a target stuck at 39", () => {
    const summary = evaluatePaceRound(round(), 39, 0.97, 0.95);

    expect(summary.totalUnits).toBe(66);
    expect(summary.onPaceShare).toBe(1);
    // 95% of the 66 right words (63) reached 56 WPM.
    expect(summary.nextTarget).toBe(56);
  });
});
