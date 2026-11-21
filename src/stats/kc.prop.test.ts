import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { TrainingEvent } from "./event";
import { kcCurve, kcStats } from "./kc";

const NUM_RUNS = Number(process.env["FC_NUM_RUNS"] ?? 100);

const eventArb = fc.record({
  at: fc.integer({ min: 1_000, max: 1_000_000 }),
  drill: fc.constant("calc" as const),
  config: fc.constant("arithmetic"),
  kc: fc.constantFrom("a", "b", "c", "d"),
  ok: fc.boolean(),
  timeMs: fc.integer({ min: 50, max: 10_000 }),
  extra: fc.record({ seed: fc.constant(1), i: fc.integer({ min: 0, max: 50 }) }),
});

describe("kc properties", () => {
  it("kcStats always returns finite BIS sorted non-decreasingly and valid ranges", () => {
    fc.assert(
      fc.property(fc.array(eventArb, { minLength: 1, maxLength: 60 }), (events: TrainingEvent[]) => {
        const stats = kcStats(events);
        for (let i = 0; i < stats.length; i++) {
          const s = stats[i]!;
          expect(Number.isFinite(s.bis)).toBe(true);
          expect(s.accuracy).toBeGreaterThanOrEqual(0);
          expect(s.accuracy).toBeLessThanOrEqual(1);
          expect(s.opportunities).toBeGreaterThan(0);
          if (i > 0) expect(stats[i - 1]!.bis).toBeLessThanOrEqual(s.bis);
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it("kcCurve never exceeds 20 opportunities and has errorRate in [0, 1]", () => {
    fc.assert(
      fc.property(fc.array(eventArb, { minLength: 0, maxLength: 80 }), (events: TrainingEvent[]) => {
        const curve = kcCurve(events);
        expect(curve.length).toBeLessThanOrEqual(20);
        for (const pt of curve) {
          expect(pt.errorRate).toBeGreaterThanOrEqual(0);
          expect(pt.errorRate).toBeLessThanOrEqual(1);
          expect(pt.count).toBeGreaterThan(0);
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
