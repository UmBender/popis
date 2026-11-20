import { describe, expect, it } from "vitest";
import {
  appendWords,
  backspaceWord,
  clearWord,
  isWordsFinished,
  MAX_EXTRA,
  pressSpace,
  startWords,
  tick,
  typeWordsText,
  wordLetters,
  wordsStats,
  wordView,
  type WordsState,
} from "./words-engine";

const UNTIMED = { lenient: false, timeLimitMs: null } as const;

/**
 * Presses `keys` one per `stepMs`, starting at `startMs`; "⌫" is
 * Backspace and "⌧" is Ctrl+Backspace. Returns the state and the time
 * of the last key.
 */
function press(state: WordsState, keys: string, startMs = 0, stepMs = 1000): WordsState {
  let next = state;
  let now = startMs;
  for (const key of keys) {
    if (key === "⌫") next = backspaceWord(next);
    else if (key === "⌧") next = clearWord(next);
    else next = typeWordsText(next, key, now);
    now += stepMs;
  }
  return next;
}

function statuses(state: WordsState): string[] {
  return wordView(state).map((w) => w.status);
}

describe("words engine", () => {
  it("words engine starts on the first word with nothing typed", () => {
    const state = startWords(["ab", "cd"], UNTIMED);
    expect(state.current).toBe(0);
    expect(state.startedAt).toBeNull();
    expect(state.finishedAt).toBeNull();
    expect(statuses(state)).toEqual(["current", "pending"]);
  });

  it("words engine refuses an empty text", () => {
    expect(() => startWords([], UNTIMED)).toThrow(RangeError);
  });

  it("words engine types letters into the current word and starts the clock", () => {
    const state = typeWordsText(startWords(["ab", "cd"], UNTIMED), "a", 500);
    expect(state.inputs[0]).toBe("a");
    expect(state.startedAt).toBe(500);
    expect(state.keystrokes).toBe(1);
    expect(state.correctKeystrokes).toBe(1);
  });

  it("words engine accepts at most 10 extra letters per word", () => {
    expect(MAX_EXTRA).toBe(10);
    const state = press(startWords(["ab", "cd"], UNTIMED), "x".repeat(15));
    expect(state.inputs[0]).toBe("x".repeat(12));
    expect(state.keystrokes).toBe(12);
  });

  it("words engine space moves to the next word even with an error", () => {
    const state = press(startWords(["ab", "cd"], UNTIMED), "ax ");
    expect(state.current).toBe(1);
    expect(statuses(state)).toEqual(["wrong", "current"]);
  });

  it("words engine space on an empty word does nothing", () => {
    const start = startWords(["ab", "cd"], UNTIMED);
    expect(pressSpace(start, 0)).toBe(start);
    const after = press(start, "ab ");
    expect(pressSpace(after, 9000)).toBe(after);
  });

  it("words engine backspace deletes one letter", () => {
    const state = press(startWords(["ab", "cd"], UNTIMED), "ax⌫");
    expect(state.inputs[0]).toBe("a");
  });

  it("words engine backspace on an empty word goes back only to a wrong word", () => {
    const wrong = press(startWords(["ab", "cd"], UNTIMED), "ax ⌫");
    expect(wrong.current).toBe(0);
    expect(wrong.inputs[0]).toBe("ax");
    const right = press(startWords(["ab", "cd"], UNTIMED), "ab ⌫");
    expect(right.current).toBe(1);
    const first = startWords(["ab", "cd"], UNTIMED);
    expect(backspaceWord(first)).toBe(first);
  });

  it("words engine ctrl backspace clears the current word", () => {
    const state = press(startWords(["abc", "cd"], UNTIMED), "abx⌧");
    expect(state.inputs[0] ?? "").toBe("");
    expect(state.current).toBe(0);
  });

  it("words engine reads a space inside typed text as the space key", () => {
    const state = typeWordsText(startWords(["ab", "cd", "ef"], UNTIMED), "ab cd ", 0);
    expect(state.current).toBe(2);
  });

  it("words engine composes decomposed accents before comparing", () => {
    const state = typeWordsText(startWords(["não"], UNTIMED), "não", 0);
    expect(isWordsFinished(state)).toBe(true);
  });

  it("words engine appendWords lets the text grow", () => {
    const state = appendWords(startWords(["ab"], UNTIMED), ["cd", "ef"]);
    expect(state.words).toEqual(["ab", "cd", "ef"]);
  });

  it("words engine ignores every key once finished", () => {
    const done = press(startWords(["ab"], UNTIMED), "ab");
    expect(isWordsFinished(done)).toBe(true);
    expect(typeWordsText(done, "x", 9000)).toBe(done);
    expect(pressSpace(done, 9000)).toBe(done);
    expect(backspaceWord(done)).toBe(done);
    expect(clearWord(done)).toBe(done);
  });
});

describe("finish", () => {
  it("finish in words mode when the last word is typed right", () => {
    const state = press(startWords(["ab", "cd"], UNTIMED), "ab cd", 0);
    expect(isWordsFinished(state)).toBe(true);
    expect(state.finishedAt).toBe(4000);
    expect(state.current).toBe(1);
  });

  it("finish in words mode when space is pressed after a wrong last word", () => {
    const typed = press(startWords(["ab", "cd"], UNTIMED), "ab cx");
    expect(isWordsFinished(typed)).toBe(false);
    const done = pressSpace(typed, 7000);
    expect(done.finishedAt).toBe(7000);
    expect(done.current).toBe(2);
    expect(statuses(done)).toEqual(["correct", "wrong"]);
  });

  it("finish in time mode ignores space on the last generated word", () => {
    const state = press(startWords(["ab", "cd"], { lenient: false, timeLimitMs: 60_000 }), "ab cd");
    expect(isWordsFinished(state)).toBe(false);
    expect(pressSpace(state, 5000)).toBe(state);
  });

  it("tick does nothing before the first key or before the limit", () => {
    const start = startWords(["ab"], { lenient: false, timeLimitMs: 15_000 });
    expect(tick(start, 99_000)).toBe(start);
    const typing = typeWordsText(start, "a", 1000);
    expect(tick(typing, 15_999)).toBe(typing);
    const untimed = typeWordsText(startWords(["ab"], UNTIMED), "a", 0);
    expect(tick(untimed, 99_000)).toBe(untimed);
  });

  it("tick ends a time test exactly at the limit", () => {
    const typing = typeWordsText(
      startWords(["ab"], { lenient: false, timeLimitMs: 15_000 }),
      "a",
      1000,
    );
    const done = tick(typing, 17_500);
    expect(done.finishedAt).toBe(16_000);
    expect(tick(done, 20_000)).toBe(done);
  });

  it("tick runs before typed text, so keys after the limit are dropped", () => {
    const typing = typeWordsText(
      startWords(["ab"], { lenient: false, timeLimitMs: 15_000 }),
      "a",
      0,
    );
    const late = typeWordsText(typing, "b", 15_000);
    expect(late.finishedAt).toBe(15_000);
    expect(late.inputs[0]).toBe("a");
    expect(pressSpace(typing, 15_000).current).toBe(0);
  });
});

describe("accents", () => {
  it("accents optional accept a word typed without diacritics", () => {
    const state = typeWordsText(
      startWords(["não", "você"], { lenient: true, timeLimitMs: null }),
      "nao voce",
      0,
    );
    expect(isWordsFinished(state)).toBe(true);
    expect(state.correctKeystrokes).toBe(state.keystrokes);
  });

  it("accents optional still accept the exact spelling and still respect case", () => {
    const lenient = { lenient: true, timeLimitMs: null };
    expect(isWordsFinished(typeWordsText(startWords(["não"], lenient), "não", 0))).toBe(true);
    expect(isWordsFinished(typeWordsText(startWords(["não"], lenient), "Nao", 0))).toBe(false);
  });

  it("accents required reject a word typed without diacritics", () => {
    const state = typeWordsText(startWords(["não"], UNTIMED), "nao", 0);
    expect(isWordsFinished(state)).toBe(false);
    expect(wordLetters("não", "nao", false).map((l) => l.mark)).toEqual([
      "correct",
      "incorrect",
      "correct",
    ]);
  });
});

describe("word view", () => {
  it("wordLetters marks correct, incorrect, extra and pending letters", () => {
    expect(wordLetters("abc", "axcde", false)).toEqual([
      { char: "a", mark: "correct" },
      { char: "b", mark: "incorrect" },
      { char: "c", mark: "correct" },
      { char: "d", mark: "extra" },
      { char: "e", mark: "extra" },
    ]);
    expect(wordLetters("abc", "a", false).map((l) => l.mark)).toEqual([
      "correct",
      "pending",
      "pending",
    ]);
  });

  it("wordView shows the statuses and letters of every word", () => {
    const state = press(startWords(["ab", "cd", "ef", "gh"], UNTIMED), "ab cx e");
    const view = wordView(state);
    expect(view.map((w) => w.status)).toEqual(["correct", "wrong", "current", "pending"]);
    expect(view[2]?.letters).toEqual(wordLetters("ef", "e", false));
    expect(view[3]?.letters).toEqual(wordLetters("gh", "", false));
  });

  it("wordView after a time test leaves an untouched current word pending", () => {
    const timed = { lenient: false, timeLimitMs: 1000 };
    const empty = tick(press(startWords(["ab", "cd"], timed), "ab ", 0, 100), 99_000);
    expect(statuses(empty)).toEqual(["correct", "pending"]);
    const partial = tick(press(startWords(["ab", "cd"], timed), "ab c", 0, 100), 99_000);
    expect(statuses(partial)).toEqual(["correct", "wrong"]);
  });
});

describe("wordsStats", () => {
  type Case = {
    readonly name: string;
    readonly words: readonly string[];
    readonly keys: string;
    readonly limitMs?: number;
    readonly endMs?: number;
    readonly expected: ReturnType<typeof wordsStats>;
  };

  // One key per second from t = 0; the run lasts from the first key to the finish.
  const CASES: readonly Case[] = [
    {
      name: "all right",
      words: ["ab", "cd"],
      keys: "ab cd",
      expected: {
        wpm: 15,
        raw: 15,
        accuracy: 1,
        correct: 4,
        incorrect: 0,
        extra: 0,
        missed: 0,
        timeMs: 4000,
      },
    },
    {
      name: "one wrong letter",
      words: ["ab", "cd"],
      keys: "ax cd",
      expected: {
        wpm: 6,
        raw: 15,
        accuracy: 0.6,
        correct: 3,
        incorrect: 1,
        extra: 0,
        missed: 0,
        timeMs: 4000,
      },
    },
    {
      name: "missing letter",
      words: ["ab", "cd"],
      keys: "a cd",
      expected: {
        wpm: 8,
        raw: 16,
        accuracy: 0.75,
        correct: 3,
        incorrect: 0,
        extra: 0,
        missed: 1,
        timeMs: 3000,
      },
    },
    {
      name: "extra letter",
      words: ["ab", "cd"],
      keys: "abx cd",
      expected: {
        wpm: 4.8,
        raw: 14.4,
        accuracy: 4 / 6,
        correct: 4,
        incorrect: 0,
        extra: 1,
        missed: 0,
        timeMs: 5000,
      },
    },
    {
      name: "fixed with backspace",
      words: ["ab", "cd"],
      keys: "ax⌫b cd",
      expected: {
        wpm: 5 / 5 / (6000 / 60_000),
        raw: 5 / 5 / (6000 / 60_000),
        accuracy: 5 / 6,
        correct: 4,
        incorrect: 0,
        extra: 0,
        missed: 0,
        timeMs: 6000,
      },
    },
    {
      name: "wrong last word ended by space",
      words: ["ab", "cd"],
      keys: "ab cx ",
      expected: {
        wpm: 3 / 5 / (5000 / 60_000),
        raw: 6 / 5 / (5000 / 60_000),
        accuracy: 4 / 6,
        correct: 3,
        incorrect: 1,
        extra: 0,
        missed: 0,
        timeMs: 5000,
      },
    },
    {
      name: "time out in a partial word",
      words: ["ab", "cd", "ef"],
      keys: "ab c",
      limitMs: 60_000,
      endMs: 60_000,
      expected: {
        wpm: 0.6,
        raw: 0.8,
        accuracy: 1,
        correct: 3,
        incorrect: 0,
        extra: 0,
        missed: 0,
        timeMs: 60_000,
      },
    },
    {
      name: "one letter in no time",
      words: ["a"],
      keys: "a",
      expected: {
        wpm: 0,
        raw: 0,
        accuracy: 1,
        correct: 1,
        incorrect: 0,
        extra: 0,
        missed: 0,
        timeMs: 0,
      },
    },
  ];

  for (const c of CASES) {
    it(`wordsStats of "${c.keys}" (${c.name}) follows the usual definitions`, () => {
      let state = press(
        startWords(c.words, { lenient: false, timeLimitMs: c.limitMs ?? null }),
        c.keys,
      );
      if (c.endMs !== undefined) state = tick(state, c.endMs);
      const stats = wordsStats(state);
      for (const [key, value] of Object.entries(c.expected)) {
        expect(stats[key as keyof typeof stats], key).toBeCloseTo(value, 9);
      }
    });
  }

  it("wordsStats refuses an unfinished test", () => {
    expect(() => wordsStats(startWords(["ab"], UNTIMED))).toThrow(RangeError);
  });
});
