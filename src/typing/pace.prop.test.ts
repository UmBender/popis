import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  ghostCodePosition,
  isUnitOnPace,
  nextTargetWpm,
  PACE_BAND,
  PACE_STEP_WPM,
} from "./pace";

const GOALS = [0.7, 0.85, 0.95] as const;

/**
 * Deterministic fixed-speed typist with realistic unit-to-unit spread
 * around `trueWpm`. Spread width is at least 30 WPM so one 2 WPM step
 * never leaps across the 10-point deadband.
 */
function simulateRound(trueWpm: number, targetWpm: number): number {
  const units = 40;
  const halfSpread = Math.max(15, trueWpm * 0.3);
  const chars = 5;
  let onPace = 0;
  for (let i = 0; i < units; i++) {
    const unitWpm = Math.max(8, trueWpm - halfSpread + (2 * halfSpread * i) / (units - 1));
    const timeMs = (chars * 12_000) / unitWpm;
    if (isUnitOnPace({ ok: true, chars, timeMs }, targetWpm)) onPace++;
  }
  return onPace / units;
}

describe("pace properties", () => {
  it("target never changes by more than one 2 WPM step per round", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 4, max: 200 }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        fc.constantFrom(...GOALS),
        (target, onPaceShare, accuracy, goal) => {
          const next = nextTargetWpm({ target, onPaceShare, accuracy, goal });
          expect(Math.abs(next - target)).toBeLessThanOrEqual(PACE_STEP_WPM);
          expect(Math.abs(next - target) === 0 || Math.abs(next - target) === PACE_STEP_WPM).toBe(
            true,
          );
        },
      ),
    );
  });

  it("on-pace share converges to goal within ±5 points for a fixed-speed typist at 70%, 85% and 95%", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 35, max: 120 }),
        fc.integer({ min: 15, max: 120 }),
        fc.constantFrom(...GOALS),
        (trueWpm, startTarget, goal) => {
          let target = startTarget;
          for (let round = 0; round < 80; round++) {
            const share = simulateRound(trueWpm, target);
            const next = nextTargetWpm({ target, onPaceShare: share, accuracy: 0.98, goal });
            expect(Math.abs(next - target)).toBeLessThanOrEqual(PACE_STEP_WPM);
            target = next;
          }
          const finalShare = simulateRound(trueWpm, target);
          expect(finalShare).toBeGreaterThanOrEqual(goal - PACE_BAND - 1e-9);
          expect(finalShare).toBeLessThanOrEqual(goal + PACE_BAND + 1e-9);
        },
      ),
    );
  });

  it("ghost code position is monotonically non-decreasing and never lands on auto-indent spaces", () => {
    const lineArb = fc
      .tuple(
        fc.integer({ min: 0, max: 8 }),
        fc.stringMatching(/^[a-z0-9_;()=]+$/),
      )
      .filter(([, body]) => body.length >= 1 && body.length <= 20)
      .map(([indent, body]) => `${" ".repeat(indent)}${body}`);
    const snippetArb = fc
      .array(lineArb, { minLength: 2, maxLength: 6 })
      .map((lines) => [lines[0]?.trimStart() ?? "a", ...lines.slice(1)].join("\n"));

    fc.assert(
      fc.property(
        snippetArb,
        fc.integer({ min: 10, max: 150 }),
        fc.integer({ min: 0, max: 20_000 }),
        fc.integer({ min: 0, max: 20_000 }),
        (text, targetWpm, t1, t2) => {
          const [a, b] = t1 <= t2 ? [t1, t2] : [t2, t1];
          const posA = ghostCodePosition(text, a, targetWpm);
          const posB = ghostCodePosition(text, b, targetWpm);
          expect(posB).toBeGreaterThanOrEqual(posA);
          expect(posB).toBeLessThanOrEqual(text.length);
          for (const pos of [posA, posB]) {
            if (pos < text.length && text[pos] === " ") {
              const lineStart = text.lastIndexOf("\n", pos - 1);
              if (lineStart !== -1) {
                const prefix = text.slice(lineStart + 1, pos + 1);
                expect(/^ +$/.test(prefix)).toBe(false);
              }
            }
          }
        },
      ),
    );
  });
});
