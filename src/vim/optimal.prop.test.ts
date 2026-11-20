import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { pressKey } from "./engine";
import { parseKeys } from "./keys";
import { LEVELS, type Level } from "./levels";
import { optimalSolution } from "./optimal";
import { createState, type Pos, type VimState } from "./state";

// AC-5: the sequence leads to the target, and an exhaustive search over
// keys finds nothing shorter in small buffers.

const TEXT_CHARS = "ab _-(){}";

const textArb = fc
  .array(fc.string({ unit: fc.constantFrom(...TEXT_CHARS), minLength: 0, maxLength: 7 }), {
    minLength: 1,
    maxLength: 3,
  })
  .map((lines) => lines.map((l) => l.trimEnd()));

const levelArb = fc.constantFrom(...LEVELS);

type Scenario = { lines: string[]; from: Pos; to: Pos; level: Level };

const scenarioArb: fc.Arbitrary<Scenario> = fc
  .record({
    lines: textArb,
    level: levelArb,
    a: fc.nat(99),
    b: fc.nat(99),
    c: fc.nat(99),
    d: fc.nat(99),
  })
  .map(({ lines, level, a, b, c, d }) => {
    const pick = (line: number, n: number): Pos => ({
      line,
      col: n % Math.max(1, (lines[line] ?? "").length),
    });
    const l1 = a % lines.length;
    const l2 = c % lines.length;
    return { lines, level, from: pick(l1, b), to: pick(l2, d) };
  });

const KEYS = [..."hjklwbeWBEg0^$fFtT;,123456789G{}%/?nN*#"].concat(["<CR>"]);

/** Fewest keys found by trying every sequence up to `maxLen`, or null. */
function exhaustive(start: VimState, target: Pos, level: Level, maxLen: number): number | null {
  const alphabet = [...KEYS, ...new Set([...start.lines.join("")])];
  const id = (s: VimState) =>
    JSON.stringify([s.cursor, s.curswant, s.pending, s.lastFind, s.lastSearch]);
  const seen = new Set([id(start)]);
  let frontier = [start];
  for (let length = 1; length <= maxLen; length++) {
    const next: VimState[] = [];
    for (const state of frontier) {
      for (const key of alphabet) {
        const typed = pressKey(state, key, level);
        if (typed.blocked !== null) continue;
        const after = typed.state;
        const done = after.pending.length === 0;
        // Sequences with a command that moves nothing are not considered:
        // a command that fails matters only through the find/search memory.
        const sameCursor =
          after.cursor.line === state.cursor.line && after.cursor.col === state.cursor.col;
        if (done && sameCursor && after.curswant === state.curswant) continue;
        // A count of two digits is outside the search space (counts are 1 to 9).
        if (/^[0-9]$/.test(key) && /^[0-9]$/.test(state.pending.at(-1) ?? "")) continue;
        if (done && after.cursor.line === target.line && after.cursor.col === target.col) {
          return length;
        }
        const k = id(after);
        if (!seen.has(k)) {
          seen.add(k);
          next.push(after);
        }
      }
    }
    frontier = next;
  }
  return null;
}

describe("optimalSolution properties", () => {
  it("the sequence it returns reaches the target with the level's keys", () => {
    fc.assert(
      fc.property(scenarioArb, ({ lines, from, to, level }) => {
        const start = createState(lines, from);
        const goal = createState(lines, to).cursor;
        const solution = optimalSolution(start, goal, level, 5);
        if (solution === null) return;
        let s = start;
        for (const key of parseKeys(solution.keys)) {
          const typed = pressKey(s, key, level);
          expect(typed.blocked).toBeNull();
          s = typed.state;
        }
        expect(s.cursor).toEqual(goal);
        expect(s.pending).toEqual([]);
        expect(parseKeys(solution.keys).length).toBe(solution.cost);
        expect(solution.cost).toBeLessThanOrEqual(5);
      }),
    );
  });

  it("no sequence of up to 3 keys is shorter than the one it returns", () => {
    fc.assert(
      fc.property(scenarioArb, ({ lines, from, to, level }) => {
        const start = createState(lines, from);
        const goal = createState(lines, to).cursor;
        const found = exhaustive(start, goal, level, 3);
        const solution = optimalSolution(start, goal, level, 3);
        if (found !== null) {
          expect(solution).not.toBeNull();
          expect(solution?.cost).toBeLessThanOrEqual(found);
        }
      }),
    );
  });

  it("on levels 1 to 4 no sequence of up to 4 keys is shorter", () => {
    fc.assert(
      fc.property(
        scenarioArb.filter((s) => s.level <= 4),
        ({ lines, from, to, level }) => {
          const start = createState(lines, from);
          const goal = createState(lines, to).cursor;
          const found = exhaustive(start, goal, level, 4);
          const solution = optimalSolution(start, goal, level, 4);
          if (found !== null) {
            expect(solution).not.toBeNull();
            expect(solution?.cost).toBeLessThanOrEqual(found);
          }
        },
      ),
    );
  });

  it("the cost is the same for the same inputs", () => {
    fc.assert(
      fc.property(scenarioArb, ({ lines, from, to, level }) => {
        const start = createState(lines, from);
        const goal = createState(lines, to).cursor;
        expect(optimalSolution(start, goal, level, 4)).toEqual(
          optimalSolution(start, goal, level, 4),
        );
      }),
    );
  });
});
