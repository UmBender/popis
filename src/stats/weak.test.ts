import { describe, expect, it } from "vitest";
import type { TrainingEvent } from "./event";
import { DAY_MS } from "./summary";
import { MIN_BIGRAM_COUNT } from "./typing-stats";
import {
  ngramIntervals,
  selectWeakSpots,
  WEAK_ERROR_CHAR_LIMIT,
  WEAK_NGRAM_LIMIT,
  WEAK_WINDOW_DAYS,
} from "./weak";

const NOW = Date.UTC(2026, 10, 22, 12);

function textEv(
  word: string,
  iv: number[],
  bad: string[][] = [],
  i = 0,
  at = NOW - DAY_MS,
  drill: "typing.text" | "typing.weak" = "typing.text",
): TrainingEvent {
  return {
    at,
    drill,
    config: drill === "typing.weak" ? "weak" : "en-30s",
    kc: drill === "typing.weak" ? `typing.ngram.${word.slice(0, 2)}` : "word",
    ok: bad.length === 0,
    timeMs: iv.reduce((a, b) => a + b, 0),
    extra: { seed: 1, i, w: word, iv, bad },
  };
}

function codeEv(
  snippet: string,
  lineIndex: number,
  iv: number[],
  bad: string[][] = [],
  at = NOW - DAY_MS,
): TrainingEvent {
  return {
    at,
    drill: "typing.code",
    config: "cpp",
    kc: "line",
    ok: bad.length === 0,
    timeMs: iv.reduce((a, b) => a + b, 0),
    extra: { seed: 2, i: lineIndex, snippet, iv, bad },
  };
}

describe("weak selection", () => {
  it("picks the 4 slowest n-grams with enough samples", () => {
    const events: TrainingEvent[] = [
      // "qu" bigram (5 samples, median 420 ms)
      ...Array.from({ length: MIN_BIGRAM_COUNT }, (_, k) =>
        textEv("qu", [400 + k * 10], [], 0, NOW - 1000 - k),
      ),
      // "xyz" trigram + "xy"/"yz" bigrams: xy=350, yz=370, xyz=(350+370)/2=360
      ...Array.from({ length: MIN_BIGRAM_COUNT }, (_, k) =>
        textEv("xyz", [350, 370], [], 0, NOW - 2000 - k, "typing.weak"),
      ),
      // "ab" bigram (6 samples, median 300 ms)
      ...Array.from({ length: 6 }, (_, k) => textEv("ab", [300], [], 0, NOW - 3000 - k)),
      // "cd" bigram (5 samples, median 150 ms — 6th slowest, cut off after top 4)
      ...Array.from({ length: 5 }, (_, k) => textEv("cd", [150], [], 0, NOW - 4000 - k)),
      // "zz" bigram (only 4 samples — below MIN_BIGRAM_COUNT, excluded even though 900 ms)
      ...Array.from({ length: MIN_BIGRAM_COUNT - 1 }, (_, k) =>
        textEv("zz", [900], [], 0, NOW - 5000 - k),
      ),
      // Error chars: ";" has 3/3 errors (1.0), "q" has 2/5 errors (0.4), "a" has 1/6 (0.167)
      textEv(";", [], [[";", ":"]], 0, NOW - 6000),
      textEv(";", [], [[";", ":"]], 0, NOW - 6001),
      textEv(";", [], [[";", ":"]], 0, NOW - 6002),
      textEv("q", [], [["q", "w"]], 0, NOW - 6003),
      textEv("q", [], [["q", "w"]], 0, NOW - 6004),
      textEv("a", [], [["a", "s"]], 0, NOW - 6005),
    ];

    const selection = selectWeakSpots(events, NOW);

    expect(selection.ngrams).toHaveLength(WEAK_NGRAM_LIMIT);
    expect(selection.ngrams.map((n) => n.ngram)).toEqual(["qu", "yz", "xyz", "xy"]);
    expect(selection.ngrams[0]?.medianMs).toBe(420);
    expect(selection.ngrams[2]?.medianMs).toBe(360);
    expect(selection.errorChars).toHaveLength(WEAK_ERROR_CHAR_LIMIT);
    expect(selection.errorChars.map((c) => c.char)).toEqual([";", "q"]);
    expect(selection.errorChars[0]?.symbol).toBe(true);
    expect(selection.targets.map((t) => t.ngram)).toEqual(["qu", "yz", "xyz", "xy", ";", "q"]);
  });

  it("ignores n-grams with whitespace", () => {
    const events: TrainingEvent[] = [
      // Words with spaces, tabs and newlines should never produce whitespace n-grams
      ...Array.from({ length: 6 }, (_, k) =>
        textEv(
          "a b\nc\td",
          [500, 500, 500, 500, 500, 500],
          [
            [" ", "x"],
            ["\n", "x"],
          ],
          0,
          NOW - 1000 - k,
        ),
      ),
      // Valid code line ("cpp-binary-search" line 0: `int lo = 0, hi = n - 1, ans = -1;`)
      ...Array.from({ length: 5 }, (_, k) =>
        codeEv(
          "cpp-binary-search",
          0,
          Array.from({ length: 32 }, () => 250),
          [],
          NOW - 2000 - k,
        ),
      ),
    ];

    const selection = selectWeakSpots(events, NOW);

    expect(selection.ngrams.length).toBeGreaterThan(0);
    for (const item of selection.ngrams) {
      expect(/\s/.test(item.ngram)).toBe(false);
    }
    expect(selection.errorChars).toEqual([]);
  });

  it("uses only the last 14 days", () => {
    const tooOld = NOW - WEAK_WINDOW_DAYS * DAY_MS - 1;
    const onBoundary = NOW - WEAK_WINDOW_DAYS * DAY_MS;
    const events: TrainingEvent[] = [
      // Slow n-gram older than 14 days: must be excluded
      ...Array.from({ length: 6 }, (_, k) => textEv("zz", [800], [["z", "x"]], 0, tooOld - k)),
      // Slower n-gram right at the 14-day boundary: included
      ...Array.from({ length: 5 }, (_, k) => textEv("qu", [260], [], 0, onBoundary + k)),
      // Non-typing event inside 14 days: ignored
      {
        at: NOW - 1000,
        drill: "calc",
        config: "arithmetic",
        kc: "arithmetic.add",
        ok: true,
        timeMs: 900,
        extra: { seed: 1, i: 0 },
      },
    ];

    const selection = selectWeakSpots(events, NOW);

    expect(selection.ngrams.map((n) => n.ngram)).toEqual(["qu"]);
    expect(selection.errorChars).toEqual([]);
  });

  it("resolves ties stably and computes ngramIntervals for 1-, 2- and 3-grams", () => {
    const events: TrainingEvent[] = [
      // Equal medians (200 ms) must break ties stably in lexicographical order
      ...Array.from({ length: 5 }, (_, k) => textEv("cd", [200], [], 0, NOW - 100 - k)),
      ...Array.from({ length: 5 }, (_, k) => textEv("ab", [200], [], 0, NOW - 200 - k)),
      // Word at i = 1 has offset = 1 (iv[0] is inter-word arrival to first char "e")
      textEv("efg", [110, 140, 180], [["e", "r"]], 1, NOW - 300),
      // Word at i = 0 has offset = 0 (first char "e" has no preceding key)
      textEv("efg", [120, 160], [], 0, NOW - 301),
      // Malformed iv / negative intervals ignored cleanly
      {
        at: NOW - 400,
        drill: "typing.text",
        config: "en",
        kc: "word",
        ok: true,
        timeMs: 100,
        extra: { seed: 1, i: 0, w: "mn", iv: [-10] },
      },
      {
        at: NOW - 401,
        drill: "typing.text",
        config: "en",
        kc: "word",
        ok: true,
        timeMs: 100,
        extra: { seed: 1, i: 0, w: "mno", iv: [100, -5] },
      },
      {
        at: NOW - 402,
        drill: "typing.text",
        config: "en",
        kc: "word",
        ok: true,
        timeMs: 100,
        extra: { seed: 1, i: 0, w: "mn", iv: "bad" },
      },
    ];

    const selection = selectWeakSpots(events, NOW);
    expect(selection.ngrams.map((n) => n.ngram)).toEqual(["ab", "cd"]);
    expect(selection.errorChars[0]?.char).toBe("e");
    expect(selection.errorChars[0]?.medianMs).toBe(110);

    expect(ngramIntervals(events, "e")).toEqual([110]);
    expect(ngramIntervals(events, "ef")).toEqual([140, 120]);
    expect(ngramIntervals(events, "efg")).toEqual([160, 140]);
    expect(ngramIntervals(events, "mno")).toEqual([]);
    expect(ngramIntervals(events, "")).toEqual([]);
  });
});
