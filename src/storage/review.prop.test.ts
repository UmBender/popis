import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { MAX_SEED } from "../core/rng";
import { MODE_IDS, MODES, type Mode } from "../modes";
import type { SessionRecord } from "./history";
import { reviewItems } from "./review";

const seed = fc.integer({ min: 0, max: MAX_SEED });
const playable = fc.constantFrom<Mode>(...MODE_IDS.filter((m) => m !== "review"));

function original(mode: Mode, s: number) {
  return MODES[mode].generator.generate(s, MODES[mode].defaults as never);
}

function skippedSession(mode: Mode, s: number): SessionRecord {
  return {
    version: 1,
    mode,
    finishedAt: 0,
    durationMs: 120_000,
    seed: 0,
    params: MODES[mode].defaults,
    log: [{ problem: original(mode, s), outcome: "skipped", timeMs: 1000, corrections: 0 }],
  };
}

describe("review item properties", () => {
  it("every mode's skipped problem becomes an item that regenerates it exactly", () => {
    fc.assert(
      fc.property(playable, seed, (mode, s) => {
        const problem = original(mode, s);
        const items = reviewItems([skippedSession(mode, s)]);
        expect(items).toHaveLength(1);
        const [first] = items;
        if (first === undefined) return;
        expect(first.mode).toBe(mode);
        const again = MODES[mode].generator.generate(first.seed, first.params as never);
        expect(again.prompt).toBe(problem.prompt);
        expect(again.answer).toBe(problem.answer);
      }),
    );
  });

  it("the review generator replays the item's original problem", () => {
    fc.assert(
      fc.property(playable, seed, seed, (mode, s, reviewSeed) => {
        const items = reviewItems([skippedSession(mode, s)]);
        expect(MODES.review.generator.generate(reviewSeed, { items })).toEqual(original(mode, s));
      }),
    );
  });
});
