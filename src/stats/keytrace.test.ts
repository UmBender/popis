import { describe, expect, it } from "vitest";
import { backspace, pressEnter, startTyping, typeText, type TypingState } from "../typing/engine";
import {
  backspaceWord,
  pressSpace,
  startWords,
  typeWordsText,
  type WordsState,
} from "../typing/words-engine";
import {
  codeEvents,
  codePaceUnits,
  textEvents,
  textPaceUnits,
  traceCode,
  traceText,
  type KeyTrace,
} from "./keytrace";

/** Runs `steps` on a code run, tracing every state change. */
function codeRun(target: string, steps: readonly [number, (s: TypingState) => TypingState][]) {
  let state = startTyping(target);
  let trace: KeyTrace = [];
  for (const [at, step] of steps) {
    const next = step(state);
    trace = traceCode(trace, state, next, at);
    state = next;
  }
  return { state, trace };
}

const type = (text: string) => (s: TypingState) => typeText(s, text, 0);

describe("code trace", () => {
  it("code trace gives one event per line with intervals and wrong characters", () => {
    const { trace } = codeRun("ab\ncd", [
      [100, (s) => typeText(s, "a", 100)],
      [250, (s) => typeText(s, "x", 250)],
      [300, backspace],
      [400, (s) => typeText(s, "b", 400)],
      [500, (s) => pressEnter(s, 500)],
      [650, (s) => typeText(s, "c", 650)],
      [700, (s) => typeText(s, "d", 700)],
    ]);

    const events = codeEvents(trace, { at: 9000, config: "cpp", seed: 5, snippetId: "cpp-1" });

    expect(events).toEqual([
      {
        at: 9000,
        drill: "typing.code",
        config: "cpp",
        kc: "line",
        ok: false,
        timeMs: 400,
        extra: { seed: 5, i: 0, snippet: "cpp-1", iv: [150, 150, 100], bad: [["b", "x"]] },
      },
      {
        at: 9000,
        drill: "typing.code",
        config: "cpp",
        kc: "line",
        ok: true,
        timeMs: 200,
        extra: { seed: 5, i: 1, snippet: "cpp-1", iv: [150, 50], bad: [] },
      },
    ]);
  });

  it("backspaces add no interval", () => {
    const typed = typeText(startTyping("abc"), "ab", 10);

    const trace = traceCode([], typed, backspace(typed), 99);

    expect(trace).toEqual([]);
  });

  it("a corrected mistake still counts as wrong", () => {
    const { trace } = codeRun("ab", [
      [10, (s) => typeText(s, "x", 10)],
      [20, backspace],
      [30, (s) => typeText(s, "a", 30)],
      [40, (s) => typeText(s, "b", 40)],
    ]);

    const [event] = codeEvents(trace, { at: 1, config: "python", seed: 1, snippetId: "p" });

    expect(event?.ok).toBe(false);
    expect(event?.extra["bad"]).toEqual([["a", "x"]]);
  });

  it("code trace of a burst gives one stamp per character", () => {
    const { trace } = codeRun("abc", [[10, type("abx")]]);

    expect(trace.map((s) => [s.typed, s.expected, s.ok])).toEqual([
      ["a", "a", true],
      ["b", "b", true],
      ["x", "c", false],
    ]);
  });

  it("auto-indent stamps as one keystroke", () => {
    const { trace } = codeRun("a\n  b", [
      [10, type("a")],
      [20, (s) => pressEnter(s, 20)],
    ]);

    expect(trace.map((s) => [s.unit, s.typed, s.ok])).toEqual([
      [0, "a", true],
      [0, "\n  ", true],
    ]);
  });

  it("code events of an empty trace are empty", () => {
    expect(codeEvents([], { at: 1, config: "cpp", seed: 1, snippetId: "x" })).toEqual([]);
  });

  it("codeEvents accepts a custom kc for burst idioms", () => {
    const { trace } = codeRun("ab\nab", [
      [100, (s) => typeText(s, "a", 100)],
      [200, (s) => typeText(s, "b", 200)],
      [300, (s) => pressEnter(s, 300)],
      [350, (s) => typeText(s, "a", 350)],
      [400, (s) => typeText(s, "b", 400)],
    ]);

    const events = codeEvents(trace, {
      at: 9000,
      config: "cpp",
      kc: "typing.idiom.for-loop",
      seed: 5,
      snippetId: "burst:cpp:for-loop:5",
    });

    expect(events).toHaveLength(2);
    expect(events.every((e) => e.kc === "typing.idiom.for-loop")).toBe(true);
    expect(events.map((e) => e.timeMs)).toEqual([200, 100]);
  });
});

function textRun(
  words: readonly string[],
  steps: readonly [number, (s: WordsState) => WordsState][],
) {
  let state = startWords(words, { lenient: false, timeLimitMs: null });
  let trace: KeyTrace = [];
  for (const [at, step] of steps) {
    const next = step(state);
    trace = traceText(trace, state, next, at);
    state = next;
  }
  return { state, trace };
}

const typeWord = (text: string, at: number): [number, (s: WordsState) => WordsState] => [
  at,
  (s) => typeWordsText(s, text, at),
];

describe("text trace", () => {
  it("text trace gives one event per word", () => {
    const { trace } = textRun(
      ["ab", "cd"],
      [
        typeWord("a", 100),
        typeWord("b", 200),
        [300, (s) => pressSpace(s, 300)],
        typeWord("c", 450),
        typeWord("x", 500),
        [550, backspaceWord],
        typeWord("d", 650),
      ],
    );

    const events = textEvents(trace, { at: 7000, config: "pt-30", seed: 3, words: ["ab", "cd"] });

    expect(events).toEqual([
      {
        at: 7000,
        drill: "typing.text",
        config: "pt-30",
        kc: "word",
        ok: true,
        timeMs: 200,
        extra: { seed: 3, i: 0, w: "ab", iv: [100, 100], bad: [] },
      },
      {
        at: 7000,
        drill: "typing.text",
        config: "pt-30",
        kc: "word",
        ok: false,
        timeMs: 350,
        extra: { seed: 3, i: 1, w: "cd", iv: [150, 50, 150], bad: [["d", "x"]] },
      },
    ]);
  });

  it("an extra letter is wrong with nothing expected", () => {
    const { trace } = textRun(["a", "c"], [typeWord("ab", 10)]);

    const [event] = textEvents(trace, { at: 1, config: "c", seed: 1, words: ["a", "c"] });

    expect(event?.extra["bad"]).toEqual([["", "b"]]);
  });

  it("a wrong word ends with a space that is not ok", () => {
    const { trace } = textRun(["ab", "cd"], [typeWord("ax", 10), [20, (s) => pressSpace(s, 20)]]);

    expect(trace.map((s) => [s.typed, s.expected, s.ok])).toEqual([
      ["a", "a", true],
      ["x", "b", false],
      [" ", " ", false],
    ]);
  });

  it("a burst of letters gives one stamp per letter", () => {
    const { trace } = textRun(["abc"], [typeWord("abx", 10)]);

    expect(trace.map((s) => [s.typed, s.expected, s.ok])).toEqual([
      ["a", "a", true],
      ["b", "b", true],
      ["x", "c", false],
    ]);
  });

  it("a state without new keystrokes leaves the trace alone", () => {
    const state = startWords(["ab"], { lenient: false, timeLimitMs: null });

    expect(traceText([], state, state, 5)).toEqual([]);
  });

  it("text events of an empty trace are empty", () => {
    expect(textEvents([], { at: 1, config: "c", seed: 1, words: ["a"] })).toEqual([]);
  });

  it("events carry target and onPace", () => {
    // Code: line 0 is "ab\n" (3 chars), line 1 is "    cd" (2 typeable chars, 4 spaces auto-indent).
    const code = codeRun("ab\n    cd", [
      [100, (s) => typeText(s, "a", 100)],
      [200, (s) => typeText(s, "b", 200)],
      [300, (s) => pressEnter(s, 300)], // line 0: 3 chars in 200 ms -> 180 WPM (>= 40)
      [700, (s) => typeText(s, "c", 700)],
      [1300, (s) => typeText(s, "d", 1300)], // line 1: 2 chars in 1000 ms -> 24 WPM (< 40)
    ]);
    const cEvents = codeEvents(code.trace, {
      at: 9000,
      config: "cpp",
      seed: 5,
      snippetId: "cpp-1",
      text: "ab\n    cd",
      target: 40,
    });
    expect(cEvents.map((e) => [e.extra["target"], e.extra["onPace"]])).toEqual([
      [40, true],
      [40, false],
    ]);

    // Code without explicit text falls back to stamp count.
    const cFallback = codeEvents(code.trace, {
      at: 9000,
      config: "cpp",
      seed: 5,
      snippetId: "cpp-1",
      target: 40,
    });
    expect(cFallback.map((e) => [e.extra["target"], e.extra["onPace"]])).toEqual([
      [40, true],
      [40, false],
    ]);

    // Text: word 0 "ab" + space = 3 chars in 200 ms (180 WPM, on pace);
    // word 1 "cd" had an error (not on pace);
    // word 2 "efgh" incomplete (only "e" typed, not on pace).
    const text = textRun(
      ["ab", "cd", "efgh"],
      [
        typeWord("a", 100),
        typeWord("b", 200),
        [300, (s) => pressSpace(s, 300)],
        typeWord("c", 350),
        typeWord("x", 400),
        [450, backspaceWord],
        typeWord("d", 500),
        [550, (s) => pressSpace(s, 550)],
        typeWord("e", 600),
      ],
    );
    const tEvents = textEvents(text.trace, {
      at: 7000,
      config: "pt-30",
      seed: 3,
      words: ["ab", "cd", "efgh"],
      target: 40,
    });
    expect(tEvents.map((e) => [e.extra["target"], e.extra["onPace"]])).toEqual([
      [40, true],
      [40, false],
      [40, false],
    ]);

    // Completed final word without trailing space is evaluated on its length.
    const finished = textRun(["ab"], [typeWord("a", 100), typeWord("b", 200)]);
    const [doneEvent] = textEvents(finished.trace, {
      at: 1,
      config: "c",
      seed: 1,
      words: ["ab"],
      target: 40,
    });
    expect(doneEvent?.extra["target"]).toBe(40);
    expect(doneEvent?.extra["onPace"]).toBe(true);
  });
});

describe("pace units", () => {
  it("textPaceUnits marks wrong and cut words", () => {
    // "ab" right with space (3 chars in 200 ms), "cd" with a fixed typo,
    // "efgh" cut after "e" by the end of the round.
    const { trace } = textRun(
      ["ab", "cd", "efgh"],
      [
        typeWord("a", 100),
        typeWord("b", 200),
        [300, (s) => pressSpace(s, 300)],
        typeWord("c", 350),
        typeWord("x", 400),
        [450, backspaceWord],
        typeWord("d", 500),
        [550, (s) => pressSpace(s, 550)],
        typeWord("e", 600),
      ],
    );
    expect(textPaceUnits(trace, ["ab", "cd", "efgh"])).toEqual([
      { ok: true, complete: true, chars: 3, timeMs: 200 },
      { ok: false, complete: true, chars: 3, timeMs: 250 },
      { ok: true, complete: false, chars: 4, timeMs: 50 },
    ]);

    // A last word typed in full without a space is complete.
    const finished = textRun(["ab"], [typeWord("a", 100), typeWord("b", 200)]);
    expect(textPaceUnits(finished.trace, ["ab"])).toEqual([
      { ok: true, complete: true, chars: 2, timeMs: 100 },
    ]);
  });

  it("codePaceUnits counts typeable characters per line", () => {
    const { trace } = codeRun("ab\n    cd", [
      [100, (s) => typeText(s, "a", 100)],
      [200, (s) => typeText(s, "b", 200)],
      [300, (s) => pressEnter(s, 300)],
      [700, (s) => typeText(s, "x", 700)],
      [800, backspace],
      [900, (s) => typeText(s, "c", 900)],
      [1300, (s) => typeText(s, "d", 1300)],
    ]);
    expect(codePaceUnits(trace, "ab\n    cd")).toEqual([
      { ok: true, complete: true, chars: 3, timeMs: 200 },
      { ok: false, complete: true, chars: 2, timeMs: 1000 },
    ]);
  });
});
