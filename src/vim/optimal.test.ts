import { describe, expect, it } from "vitest";
import { systemClock } from "../core/clock";
import { CORPUS } from "../typing/corpus";
import { generateTarget } from "./drills/target";
import { pressKey } from "./engine";
import { parseKeys } from "./keys";
import type { Level } from "./levels";
import { optimalSolution, recalculateOptimal } from "./optimal";
import { createState, type Pos, type VimState } from "./state";

// AC-5: the minimum number of keys to reach a target, and a sequence that does.

function start(text: string, from: Pos): VimState {
  return createState(text.split("\n"), from);
}

/** Types the keys and returns the final cursor, or null when a key is blocked. */
function replay(state: VimState, keys: string, level: Level): Pos | null {
  let s = state;
  for (const key of parseKeys(keys)) {
    const r = pressKey(s, key, level);
    if (r.blocked !== null) return null;
    s = r.state;
  }
  return s.pending.length === 0 ? s.cursor : null;
}

const WORDS = "ab ab ab ab ab ab";

describe("optimalSolution", () => {
  it("optimalSolution needs no keys when the cursor is on the target", () => {
    const s = start("abc", { line: 0, col: 1 });
    expect(optimalSolution(s, { line: 0, col: 1 }, 1)).toEqual({ keys: "", cost: 0 });
  });

  it("optimalSolution counts one key per step with only h j k l", () => {
    const s = start("abc\ndef", { line: 0, col: 0 });
    const target = { line: 1, col: 2 };
    const solution = optimalSolution(s, target, 1);
    expect(solution?.cost).toBe(3);
    expect(replay(s, solution?.keys ?? "", 1)).toEqual(target);
  });

  it("optimalSolution prefers word motions on level 2", () => {
    const s = start(WORDS, { line: 0, col: 0 });
    expect(optimalSolution(s, { line: 0, col: 6 }, 2)?.cost).toBe(2);
    expect(optimalSolution(s, { line: 0, col: 6 }, 1, 8)?.cost).toBe(6);
  });

  it("optimalSolution values a count at 2 keys on level 5", () => {
    const s = start(WORDS, { line: 0, col: 0 });
    const target = { line: 0, col: 12 };
    expect(optimalSolution(s, target, 5)).toEqual({ keys: "4w", cost: 2 });
    expect(optimalSolution(s, target, 4)?.cost).toBe(3);
  });

  it("optimalSolution uses f for a character on the line", () => {
    const s = start("a1 b2 c3 d4", { line: 0, col: 0 });
    expect(optimalSolution(s, { line: 0, col: 7 }, 4)).toEqual({ keys: "f3", cost: 2 });
  });

  it("optimalSolution uses * for the next occurrence of the word", () => {
    const s = start("foo x foo", { line: 0, col: 0 });
    const target = { line: 0, col: 6 };
    expect(optimalSolution(s, target, 7)).toEqual({ keys: "*", cost: 1 });
    expect(optimalSolution(s, target, 6)?.cost).toBe(2);
  });

  it("optimalSolution counts a search as slash, pattern and Enter", () => {
    const lines = [...Array.from({ length: 11 }, () => "aaaaaaaaaaaa"), "aaaaaaaaaQaa"];
    const s = createState(lines, { line: 0, col: 0 });
    const target = { line: 11, col: 9 };
    const solution = optimalSolution(s, target, 7, 3);
    expect(solution?.cost).toBe(3);
    expect(parseKeys(solution?.keys ?? "")).toHaveLength(3);
    expect(replay(s, solution?.keys ?? "", 7)).toEqual(target);
    expect(optimalSolution(s, target, 5, 3)).toBeNull();
  });

  it("optimalSolution returns null when the target needs more keys than allowed", () => {
    const s = start("abcdefghij", { line: 0, col: 0 });
    expect(optimalSolution(s, { line: 0, col: 9 }, 1, 5)).toBeNull();
    expect(optimalSolution(s, { line: 0, col: 9 }, 1, 9)?.cost).toBe(9);
  });

  it("optimalSolution only uses keys the level allows", () => {
    const s = start("foo(bar, baz)\nqux", { line: 0, col: 0 });
    for (const level of [1, 2, 3, 4, 5, 6, 7] as const) {
      const solution = optimalSolution(s, { line: 1, col: 1 }, level, 8);
      expect(solution).not.toBeNull();
      expect(replay(s, solution?.keys ?? "", level)).toEqual({ line: 1, col: 1 });
    }
  });

  it("optimalSolution answers in under 50 ms for a target of a corpus snippet", () => {
    for (const level of [4, 7] as const) {
      for (let index = 0; index < 6; index++) {
        const t = generateTarget(1000 + index, index, level);
        const s = createState(t.lines, t.start);
        const ms = fastest(5, () => optimalSolution(s, t.target, level, t.minimum));
        expect(ms, `${t.snippetId} level ${String(level)}`).toBeLessThan(50);
      }
    }
  });

  it("optimalSolution gives up within 250 ms when a corpus snippet has no solution", () => {
    const snippets = CORPUS.filter((c) => c.text.split("\n").length <= 15).slice(0, 6);
    expect(snippets.length).toBe(6);
    for (const level of [4, 7] as const) {
      for (const snippet of snippets) {
        const lines = snippet.text.split("\n");
        const s = createState(lines, { line: 0, col: 0 });
        const last = lines.length - 1;
        const target = { line: last, col: Math.floor((lines[last] ?? "").length / 2) };
        const ms = fastest(3, () => optimalSolution(s, target, level, 4));
        expect(ms, `${snippet.id} level ${String(level)}`).toBeLessThan(250);
      }
    }
  });
});

describe("recalculateOptimal (T21 AC-2, AC-3)", () => {
  it("recalculateOptimal returns empty solution when cursor is already on target", () => {
    const s = start("abc\ndef", { line: 1, col: 1 });
    expect(recalculateOptimal(s, { line: 1, col: 1 }, 4)).toEqual({ keys: "", cost: 0 });
  });

  it("recalculateOptimal finds a valid optimal path from an off-path state at every level", () => {
    const s = start("int main() {\n  int x = foo(a, b);\n  return x;\n}", { line: 0, col: 0 });
    const target = { line: 1, col: 14 };
    const offPath = pressKey(s, "j", 4).state;
    for (const level of [1, 2, 3, 4, 5, 6, 7] as const) {
      const sol = recalculateOptimal(offPath, target, level);
      expect(sol.cost).toBeGreaterThan(0);
      expect(replay({ ...offPath, pending: [] }, sol.keys, level)).toEqual(target);
    }
  });

  it("recalculateOptimal falls back to a valid level path when target exceeds search bound", () => {
    const lines = Array.from({ length: 12 }, () => "0123456789abcdefghij");
    const s = createState(lines, { line: 0, col: 0 });
    const target = { line: 11, col: 18 };
    for (const level of [1, 5, 6] as const) {
      const sol = recalculateOptimal(s, target, level);
      expect(sol.cost).toBeGreaterThan(0);
      expect(replay(s, sol.keys, level)).toEqual(target);
    }
  });

  it("recalculateOptimal answers in under 16 ms on level 7 worst-case corpus snippets", () => {
    const snippets = CORPUS.filter((c) => c.text.split("\n").length <= 15);
    // Largest snippets by line count and character count represent the worst case.
    const worst = [...snippets].sort((a, b) => b.text.length - a.text.length).slice(0, 6);
    for (const snippet of worst) {
      const lines = snippet.text.split("\n");
      const midLine = Math.floor(lines.length / 2);
      const from = createState(lines, { line: 0, col: 0 });
      const target = {
        line: midLine,
        col: Math.floor((lines[midLine] ?? "").length / 2),
      };
      const ms = fastest(5, () => {
        const sol = recalculateOptimal(from, target, 7);
        expect(replay(from, sol.keys, 7)).toEqual(target);
      });
      expect(ms, `${snippet.id} level 7`).toBeLessThan(16);
    }
  });
});

/** The time of the fastest of `runs` calls: a busy machine only slows the others. */
function fastest(runs: number, run: () => void): number {
  let best = Infinity;
  for (let i = 0; i < runs; i++) {
    const before = systemClock.now();
    run();
    best = Math.min(best, systemClock.now() - before);
  }
  return best;
}
