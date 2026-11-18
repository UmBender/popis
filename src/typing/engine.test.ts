import { describe, expect, it } from "vitest";
import {
  backspace,
  isFinished,
  marks,
  pressEnter,
  startTyping,
  typeableLength,
  typeText,
  typingStats,
  type TypingState,
} from "./engine";

/** Applies keys at t = 0: text, "⏎" for Enter and "⌫" for Backspace. */
function keys(state: TypingState, sequence: readonly string[], now = 0): TypingState {
  return sequence.reduce(
    (s, k) => (k === "⏎" ? pressEnter(s, now) : k === "⌫" ? backspace(s) : typeText(s, k, now)),
    state,
  );
}

describe("engine", () => {
  it("engine starts empty with everything pending", () => {
    const s = startTyping("ab");
    expect(s.typed).toBe("");
    expect(s.startedAt).toBeNull();
    expect(marks(s)).toEqual(["pending", "pending"]);
    expect(isFinished(s)).toBe(false);
  });

  it("engine marks typed characters by position", () => {
    const s = typeText(startTyping("abc"), "a", 0);
    expect(marks(s)).toEqual(["correct", "pending", "pending"]);
  });

  it("engine keeps a wrong character and lets the player type on", () => {
    const s = typeText(startTyping("abc"), "xbc", 0);
    expect(s.typed).toBe("xbc");
    expect(marks(s)).toEqual(["wrong", "correct", "correct"]);
    expect(isFinished(s)).toBe(false);
  });

  it("engine fixes a wrong character with backspace", () => {
    const s = keys(startTyping("abc"), ["x", "⌫", "a"]);
    expect(s.typed).toBe("a");
    expect(marks(s)).toEqual(["correct", "pending", "pending"]);
  });

  it("engine backspace on empty text does nothing", () => {
    const s = startTyping("ab");
    expect(backspace(s)).toEqual(s);
  });

  it("engine ignores keys past the end of the target", () => {
    const s = keys(startTyping("ab"), ["a", "x", "y", "⏎"]);
    expect(s.typed).toBe("ax");
    expect(s.keystrokes).toBe(2);
  });

  it("engine starts the clock on the first key only", () => {
    let s = typeText(startTyping("abc"), "a", 500);
    s = typeText(s, "b", 900);
    expect(s.startedAt).toBe(500);
    expect(s.finishedAt).toBeNull();
  });

  it("engine finishes when the text equals the target and then ignores keys", () => {
    let s = typeText(startTyping("ab"), "a", 100);
    s = typeText(s, "b", 700);
    expect(isFinished(s)).toBe(true);
    expect(s.finishedAt).toBe(700);
    expect(keys(s, ["c", "⌫", "⏎"])).toEqual(s);
  });

  it("engine treats a newline in typed text as Enter", () => {
    const s = typeText(startTyping("if x:\n    y"), "if x:\ny", 0);
    expect(s.typed).toBe("if x:\n    y");
    expect(isFinished(s)).toBe(true);
  });
});

describe("auto-indent", () => {
  const TARGET = "if x:\n    y = 1\nz";

  it("auto-indent inserts the next line's indentation on Enter", () => {
    const s = keys(startTyping(TARGET), ["if x:", "⏎"]);
    expect(s.typed).toBe("if x:\n    ");
    expect(s.correct).toBe(6);
    expect(s.keystrokes).toBe(6);
  });

  it("auto-indent inserts nothing after Enter before an unindented line", () => {
    const s = keys(startTyping(TARGET), ["if x:", "⏎", "y = 1", "⏎"]);
    expect(s.typed).toBe("if x:\n    y = 1\n");
  });

  it("auto-indent still applies after an earlier mistake", () => {
    const s = keys(startTyping(TARGET), ["iX x:", "⏎"]);
    expect(s.typed).toBe("iX x:\n    ");
    expect(marks(s).slice(0, 6)).toEqual([
      "correct",
      "wrong",
      "correct",
      "correct",
      "correct",
      "correct",
    ]);
  });

  it("auto-indent: Enter where no newline is expected inserts a wrong newline", () => {
    const s = keys(startTyping(TARGET), ["if", "⏎"]);
    expect(s.typed).toBe("if\n");
    expect(marks(s)[2]).toBe("wrong");
    expect(s.keystrokes - s.correct).toBe(1);
  });

  it("auto-indent: backspace right after it removes the indentation and the newline", () => {
    const s = keys(startTyping(TARGET), ["if x:", "⏎", "⌫"]);
    expect(s.typed).toBe("if x:");
  });

  it("auto-indent: backspace after typing on removes one character, then the indentation", () => {
    let s = keys(startTyping(TARGET), ["if x:", "⏎", "y", "⌫"]);
    expect(s.typed).toBe("if x:\n    ");
    s = backspace(s);
    expect(s.typed).toBe("if x:");
  });

  it("auto-indent: a wrong newline is removed alone", () => {
    const s = keys(startTyping(TARGET), ["if", "⏎", "⌫"]);
    expect(s.typed).toBe("if");
  });
});

describe("typingStats", () => {
  it("typeableLength leaves out the indentation", () => {
    expect(typeableLength("ab")).toBe(2);
    expect(typeableLength("if x:\n    y")).toBe(7);
    expect(typeableLength("a\n    b\n        c\nd")).toBe(7);
  });

  it.each<{
    name: string;
    target: string;
    steps: readonly (readonly [string, number])[];
    wpm: number;
    accuracy: number;
    errors: number;
    timeMs: number;
  }>([
    {
      name: "two clean keys in 12 s",
      target: "ab",
      steps: [
        ["a", 0],
        ["b", 12_000],
      ],
      wpm: 2,
      accuracy: 1,
      errors: 0,
      timeMs: 12_000,
    },
    {
      name: "auto-indent does not count as typed",
      target: "if x:\n    y",
      steps: [
        ["if x:", 0],
        ["⏎", 30_000],
        ["y", 60_000],
      ],
      wpm: 1.4,
      accuracy: 1,
      errors: 0,
      timeMs: 60_000,
    },
    {
      name: "a fixed mistake lowers accuracy",
      target: "ab",
      steps: [
        ["x", 0],
        ["⌫", 1000],
        ["a", 2000],
        ["b", 30_000],
      ],
      wpm: 0.8,
      accuracy: 2 / 3,
      errors: 1,
      timeMs: 30_000,
    },
    {
      name: "a wrong Enter counts as an error",
      target: "ab",
      steps: [
        ["⏎", 0],
        ["⌫", 1000],
        ["a", 2000],
        ["b", 6000],
      ],
      wpm: 4,
      accuracy: 2 / 3,
      errors: 1,
      timeMs: 6000,
    },
    {
      name: "no time gives zero wpm",
      target: "a",
      steps: [["a", 5000]],
      wpm: 0,
      accuracy: 1,
      errors: 0,
      timeMs: 0,
    },
  ])("typingStats: $name", ({ target, steps, wpm, accuracy, errors, timeMs }) => {
    const s = steps.reduce<TypingState>(
      (state, [k, t]) =>
        k === "⏎" ? pressEnter(state, t) : k === "⌫" ? backspace(state) : typeText(state, k, t),
      startTyping(target),
    );
    const stats = typingStats(s);
    expect(stats.wpm).toBeCloseTo(wpm, 10);
    expect(stats.accuracy).toBeCloseTo(accuracy, 10);
    expect(stats.errors).toBe(errors);
    expect(stats.timeMs).toBe(timeMs);
  });

  it("typingStats of an unfinished text throws", () => {
    expect(() => typingStats(typeText(startTyping("ab"), "a", 0))).toThrow(RangeError);
  });
});
