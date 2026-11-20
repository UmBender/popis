import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { MAX_SEED } from "../../core/rng";
import { pressKey } from "../engine";
import { parseKeys } from "../keys";
import { LEVELS, type Level } from "../levels";
import { optimalSolution } from "../optimal";
import { createState, type VimState } from "../state";
import { generateTarget, targetLimits } from "./target";

// AC-6: reachable, within the level's limits, same seed same target, and the
// solution needs a movement of the level itself.

// Each case searches for the optimal keys, so a property takes seconds when the
// machine is busy (and minutes with `npm run test:fuzz`).
const SLOW_MS = 600_000;

const argsArb = fc.record({
  seed: fc.integer({ min: 0, max: MAX_SEED }),
  index: fc.nat(50),
  level: fc.constantFrom(...LEVELS),
});

function replay(state: VimState, keys: string, level: Level): VimState | null {
  let s = state;
  for (const key of parseKeys(keys)) {
    const r = pressKey(s, key, level);
    if (r.blocked !== null) return null;
    s = r.state;
  }
  return s;
}

describe("generateTarget properties", () => {
  it("the target is reachable with the keys of its solution", () => {
    fc.assert(
      fc.property(argsArb, ({ seed, index, level }) => {
        const t = generateTarget(seed, index, level);
        const end = replay(createState(t.lines, t.start), t.solution, level);
        expect(end?.cursor).toEqual(t.target);
        expect(end?.pending).toEqual([]);
        expect(parseKeys(t.solution)).toHaveLength(t.minimum);
      }),
    );
  }, SLOW_MS);

  it("the minimum is within the limits of the level and is the true minimum", () => {
    fc.assert(
      fc.property(argsArb, ({ seed, index, level }) => {
        const t = generateTarget(seed, index, level);
        const { min, max } = targetLimits(level);
        expect(t.minimum).toBeGreaterThanOrEqual(min);
        expect(t.minimum).toBeLessThanOrEqual(max);
        const best = optimalSolution(createState(t.lines, t.start), t.target, level, max);
        expect(best?.cost).toBe(t.minimum);
      }),
    );
  }, SLOW_MS);

  it("above level 1 the target is not reachable as fast without the level's movements", () => {
    fc.assert(
      fc.property(
        argsArb.filter((a) => a.level > 1),
        ({ seed, index, level }) => {
          const t = generateTarget(seed, index, level);
          const lower = optimalSolution(
            createState(t.lines, t.start),
            t.target,
            (level - 1) as Level,
            t.minimum,
          );
          expect(lower).toBeNull();
          // So the solution cannot be typed one level down.
          const end = replay(createState(t.lines, t.start), t.solution, (level - 1) as Level);
          expect(end?.cursor).not.toEqual(t.target);
        },
      ),
    );
  }, SLOW_MS);

  it("the same seed, index and level give the same target", () => {
    fc.assert(
      fc.property(argsArb, ({ seed, index, level }) => {
        expect(generateTarget(seed, index, level)).toEqual(generateTarget(seed, index, level));
      }),
    );
  }, SLOW_MS);
});

describe("generateTarget levels", () => {
  it("a target for every level is generated", () => {
    for (const level of LEVELS) expect(generateTarget(1, 0, level).level).toBe(level);
  });
});
