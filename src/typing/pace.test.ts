import { describe, expect, it } from "vitest";
import {
  codeLineLengths,
  DEFAULT_INITIAL_TARGET_WPM,
  evaluatePaceRound,
  goalSpeedWpm,
  ghostCodePosition,
  ghostTextPosition,
  initialTargetWpm,
  isUnitOnPace,
  MIN_TARGET_WPM,
  nextTargetWpm,
  targetIntervalMs,
} from "./pace";

describe("pace target adjustment", () => {
  it("pace target rises 2 wpm when on-pace share is above goal and accuracy is at least 95%", () => {
    expect(nextTargetWpm({ target: 40, onPaceShare: 0.9, accuracy: 0.95, goal: 0.85 })).toBe(42);
    expect(nextTargetWpm({ target: 40, onPaceShare: 0.85, accuracy: 0.98, goal: 0.8 })).toBe(42);
    expect(nextTargetWpm({ target: 40, onPaceShare: 1, accuracy: 1, goal: 0.95 })).toBe(42);
  });

  it("pace target stays when accuracy is below 95%", () => {
    expect(nextTargetWpm({ target: 40, onPaceShare: 0.95, accuracy: 0.94, goal: 0.85 })).toBe(40);
  });

  it("pace target falls 2 wpm when on-pace share is below goal", () => {
    expect(nextTargetWpm({ target: 40, onPaceShare: 0.8, accuracy: 1, goal: 0.85 })).toBe(38);
    expect(nextTargetWpm({ target: 40, onPaceShare: 0.65, accuracy: 0.9, goal: 0.7 })).toBe(38);
    expect(
      nextTargetWpm({ target: MIN_TARGET_WPM, onPaceShare: 0, accuracy: 0.5, goal: 0.85 }),
    ).toBe(MIN_TARGET_WPM);
  });

  it("pace target stays when on-pace share is within ±5 points of goal", () => {
    expect(nextTargetWpm({ target: 40, onPaceShare: 0.85, accuracy: 1 })).toBe(40);
    expect(nextTargetWpm({ target: 40, onPaceShare: 0.81, accuracy: 1, goal: 0.85 })).toBe(40);
    expect(nextTargetWpm({ target: 40, onPaceShare: 0.89, accuracy: 1, goal: 0.85 })).toBe(40);
  });

  it("initial target is the median of the last 10 rounds", () => {
    expect(initialTargetWpm([])).toBe(DEFAULT_INITIAL_TARGET_WPM);
    expect(initialTargetWpm([40, 50, 60])).toBe(50);
    expect(initialTargetWpm([40, 50])).toBe(45);
    // Ignores earlier rounds before the last 10.
    expect(initialTargetWpm([10, 10, 10, 42, 44, 46, 48, 50, 52, 54, 56, 58, 60])).toBe(51);
    expect(initialTargetWpm([1, 2])).toBe(MIN_TARGET_WPM);
  });
});

describe("on-pace unit check and round evaluation", () => {
  it("unit is on pace when correct and speed is at least target WPM", () => {
    // 5 chars in 2000 ms = 30 WPM exactly.
    expect(isUnitOnPace({ ok: true, chars: 5, timeMs: 2000 }, 30)).toBe(true);
    expect(isUnitOnPace({ ok: true, chars: 5, timeMs: 2001 }, 30)).toBe(false);
    expect(isUnitOnPace({ ok: false, chars: 5, timeMs: 1000 }, 30)).toBe(false);
    expect(isUnitOnPace({ ok: true, chars: 0, timeMs: 1000 }, 30)).toBe(false);
    expect(isUnitOnPace({ ok: true, chars: 5, timeMs: 0 }, 30)).toBe(true);
  });

  it("codeLineLengths counts typeable characters per line excluding auto-indent", () => {
    expect(codeLineLengths("int main() {\n    return 0;\n}")).toEqual([13, 10, 1]);
    expect(codeLineLengths("x = 1")).toEqual([5]);
  });

  it("evaluatePaceRound summarises on-pace share and next target", () => {
    // 9 right words at 36 WPM and 1 at 20 WPM: 90% on pace against 30,
    // and the goal speed (36) is not far enough above 30 to jump.
    const fast = { ok: true, complete: true, chars: 5, timeMs: (5 * 12_000) / 36 };
    const slow = { ok: true, complete: true, chars: 5, timeMs: 3000 };
    expect(evaluatePaceRound([...Array.from({ length: 9 }, () => fast), slow], 30, 0.98)).toEqual({
      target: 30,
      nextTarget: 32,
      onPaceCount: 9,
      totalUnits: 10,
      onPaceShare: 0.9,
    });
  });

  it("evaluatePaceRound ignores wrong and incomplete units", () => {
    const onPace = { ok: true, complete: true, chars: 5, timeMs: 1000 }; // 60 WPM
    const wrong = { ok: false, complete: true, chars: 5, timeMs: 1000 };
    const cut = { ok: true, complete: false, chars: 2, timeMs: 5000 };
    const summary = evaluatePaceRound(
      [...Array.from({ length: 8 }, () => onPace), wrong, wrong, cut],
      50,
      0.97,
      0.95,
    );
    expect(summary.totalUnits).toBe(8);
    expect(summary.onPaceCount).toBe(8);
    expect(summary.onPaceShare).toBe(1);
    expect(summary.nextTarget).toBe(52);
  });

  it("evaluatePaceRound keeps the target when no unit counts", () => {
    const wrong = { ok: false, complete: true, chars: 5, timeMs: 1000 };
    const cut = { ok: true, complete: false, chars: 2, timeMs: 1000 };
    for (const units of [[], [wrong], [wrong, cut]]) {
      expect(evaluatePaceRound(units, 30, 1)).toEqual({
        target: 30,
        nextTarget: 30,
        onPaceCount: 0,
        totalUnits: 0,
        onPaceShare: 0,
      });
    }
  });

  it("goalSpeedWpm is the speed reached by the goal share of units", () => {
    // 10 right words at 10, 20, …, 100 WPM.
    const units = Array.from({ length: 10 }, (_, i) => ({
      ok: true,
      complete: true,
      chars: 5,
      timeMs: (5 * 12_000) / (10 * (i + 1)),
    }));
    expect(goalSpeedWpm(units, 0.85)).toBe(20); // 9 of 10 reached 20
    expect(goalSpeedWpm(units, 0.7)).toBe(40); // 7 of 10 reached 40
    expect(goalSpeedWpm(units, 0.95)).toBe(10); // all 10 reached 10
    expect(goalSpeedWpm([{ ok: true, complete: true, chars: 5, timeMs: 700 }], 0.85)).toBe(85);
    expect(goalSpeedWpm([], 0.85)).toBeNull();
    expect(goalSpeedWpm([{ ok: false, complete: true, chars: 5, timeMs: 700 }], 0.85)).toBeNull();
    expect(goalSpeedWpm([{ ok: true, complete: true, chars: 5, timeMs: 0 }], 0.85)).toBeNull();
  });

  it("evaluatePaceRound jumps to the goal speed when far below", () => {
    // 20 right words at 60 WPM: goal speed 60, far above 30.
    const at60 = Array.from({ length: 20 }, () => ({
      ok: true,
      complete: true,
      chars: 5,
      timeMs: 1000,
    }));
    expect(evaluatePaceRound(at60, 30, 0.98).nextTarget).toBe(60);
    // 10 WPM below the goal speed is not "far": the 2 WPM step stays.
    expect(evaluatePaceRound(at60, 50, 0.98).nextTarget).toBe(52);
    // Below the accuracy floor the target does not rise at all.
    expect(evaluatePaceRound(at60, 30, 0.94).nextTarget).toBe(30);
  });

  it("targetIntervalMs returns milliseconds per character for a target WPM", () => {
    expect(targetIntervalMs(60)).toBe(200);
    expect(targetIntervalMs(30)).toBe(400);
  });
});

describe("ghost caret position", () => {
  it("ghost position after t seconds skips auto-indent", () => {
    const code = "a\n    b\n  c";
    // At 60 WPM: 5 chars/s = 1 char per 200 ms.
    // Typeable positions: 0 ('a'), 1 ('\n'), 6 ('b'), 7 ('\n'), 10 ('c').
    expect(ghostCodePosition(code, 0, 60)).toBe(0);
    expect(ghostCodePosition(code, 200, 60)).toBe(1);
    expect(ghostCodePosition(code, 400, 60)).toBe(6);
    expect(ghostCodePosition(code, 600, 60)).toBe(7);
    expect(ghostCodePosition(code, 800, 60)).toBe(10);
    expect(ghostCodePosition(code, 1000, 60)).toBe(code.length);
    expect(ghostCodePosition(code, -50, 60)).toBe(0);
  });

  it("ghostTextPosition advances through words and spaces and returns null past the end", () => {
    const words = ["ab", "cde"];
    // At 60 WPM: 1 char per 200 ms. Total typeable: a(0), b(1), space(2), c(3), d(4), e(5).
    expect(ghostTextPosition(words, 0, 60)).toEqual({ word: 0, letter: 0 });
    expect(ghostTextPosition(words, 200, 60)).toEqual({ word: 0, letter: 1 });
    expect(ghostTextPosition(words, 400, 60)).toEqual({ word: 0, letter: 2 });
    expect(ghostTextPosition(words, 600, 60)).toEqual({ word: 1, letter: 0 });
    expect(ghostTextPosition(words, 800, 60)).toEqual({ word: 1, letter: 1 });
    expect(ghostTextPosition(words, 1000, 60)).toEqual({ word: 1, letter: 2 });
    expect(ghostTextPosition(words, 1200, 60)).toBeNull();
    expect(ghostTextPosition([], 0, 60)).toBeNull();
  });
});
