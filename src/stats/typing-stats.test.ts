import { describe, expect, it } from "vitest";
import type { TrainingEvent } from "./event";
import { errorChars, isCodeSymbol, slowestBigrams } from "./typing-stats";

function textEv(word: string, iv: number[], bad: string[][], i: number, at = 1000): TrainingEvent {
  return {
    at,
    drill: "typing.text",
    config: "pt-60s",
    kc: "word",
    ok: bad.length === 0,
    timeMs: iv.reduce((a, b) => a + b, 0),
    extra: { seed: 1, i, w: word, iv, bad },
  };
}

function codeEv(
  snippet: string,
  lineIndex: number,
  iv: number[],
  bad: string[][],
  at = 2000,
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

describe("typing-stats", () => {
  it("slowestBigrams requires at least 5 occurrences and ranks by median", () => {
    const events: TrainingEvent[] = [
      // "qu" appears 5 times with median 320 ms; "th" appears 6 times with median 120 ms; "zz" appears 4 times (excluded)
      ...Array.from({ length: 5 }, (_, k) => textEv("qu", [300 + k * 10], [], 0, 1000 + k)),
      ...Array.from({ length: 6 }, (_, k) => textEv("th", [100 + k * 10], [], 0, 2000 + k)),
      ...Array.from({ length: 4 }, (_, k) => textEv("zz", [900], [], 0, 3000 + k)),
    ];
    const bigrams = slowestBigrams(events);
    expect(bigrams.map((b) => b.bigram)).toEqual(["qu", "th"]);
    expect(bigrams[0]?.medianMs).toBe(320);
    expect(bigrams[0]?.count).toBe(5);
    expect(bigrams[1]?.medianMs).toBe(125);
  });

  it("errorChars ranks characters by error rate and tags code symbols", () => {
    const events: TrainingEvent[] = [
      // "cpp-binary-search" line 0 is: `int lo = 0, hi = n - 1, ans = -1;`
      codeEv("cpp-binary-search", 0, [], [[";", ":"]], 1000),
      codeEv(
        "cpp-binary-search",
        0,
        [],
        [
          [";", ":"],
          ["i", "o"],
        ],
        2000,
      ),
    ];
    const errs = errorChars(events);
    expect(errs[0]?.char).toBe(";");
    expect(errs[0]?.symbol).toBe(true);
    expect(errs[0]?.errors).toBe(2);
    expect(errs[0]?.errorRate).toBe(1);
    const iErr = errs.find((e) => e.char === "i");
    expect(iErr?.symbol).toBe(false);
    expect(iErr?.errors).toBe(1);
    expect(isCodeSymbol("->")).toBe(true);
    expect(isCodeSymbol("ab")).toBe(false);
  });

  it("slowestBigrams and errorChars handle code lines, non-typing events and malformed extras safely", () => {
    const codeEvents = Array.from({ length: 6 }, (_, k) =>
      codeEv("cpp-binary-search", 1, [80, 150, 160, 170, 180, 190], [[" ", "a"]], 1000 + k),
    );
    const bigrams = slowestBigrams([
      ...codeEvents,
      // Equal-median tie-break on bigram name ("ab" vs "cd")
      ...Array.from({ length: 5 }, (_, k) => textEv("ab", [200], [], 0, 5000 + k)),
      ...Array.from({ length: 5 }, (_, k) => textEv("cd", [200], [], 0, 6000 + k)),
      // Unknown snippet, non-typing drill, missing word, non-array iv/bad, negative interval
      codeEv(
        "missing-snippet",
        0,
        [100],
        [
          ["x", "y"],
          ["z", "w"],
        ],
      ),
      {
        at: 1,
        drill: "calc",
        config: "arithmetic",
        kc: "arithmetic.add",
        ok: true,
        timeMs: 1000,
        extra: { seed: 1, i: 0 },
      },
      {
        at: 2,
        drill: "typing.text",
        config: "pt",
        kc: "word",
        ok: true,
        timeMs: 100,
        extra: { seed: 1, i: 0, w: "a b", iv: [-5, 100] },
      },
      {
        at: 3,
        drill: "typing.code",
        config: "cpp",
        kc: "line",
        ok: true,
        timeMs: 100,
        extra: { seed: 1, i: 0, snippet: 123, bad: ["not-pair", [123]] },
      },
      {
        at: 4,
        drill: "typing.text",
        config: "pt",
        kc: "word",
        ok: true,
        timeMs: 100,
        extra: { seed: 1, i: 0, w: 999 },
      },
    ]);
    expect(bigrams.some((b) => b.bigram === "wh")).toBe(true);
    expect(errorChars(codeEvents)).toEqual([]);
    // Tie-breaking in errorChars (equal rate -> errors desc -> char asc) and missing unitText fallback
    const tiedErrs = errorChars([
      codeEv(
        "missing-snippet",
        0,
        [],
        [
          ["b", "x"],
          ["a", "x"],
          ["c", "x"],
          ["c", "x"],
        ],
      ),
      {
        at: 3,
        drill: "typing.code",
        config: "cpp",
        kc: "line",
        ok: true,
        timeMs: 100,
        extra: { seed: 1, i: 0, snippet: 123, bad: ["not-pair", [123]] },
      },
    ]);
    expect(tiedErrs.map((e) => e.char)).toEqual(["c", "a", "b"]);
  });
});
