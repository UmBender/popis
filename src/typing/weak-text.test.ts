import { describe, expect, it } from "vitest";
import { CODE_WORDS } from "./code-words";
import { WORDS } from "./words";
import {
  countOccurrences,
  generateWeakLine,
  generateWeakLines,
  MIN_OCCURRENCES_PER_LINE,
  WEAK_WORDS_PER_LINE,
  weakWordsFrom,
} from "./weak-text";

const LETTER_POOL = new Set([...WORDS.en, ...CODE_WORDS]);

describe("weak-text", () => {
  it("draws matching English and code words for letter n-grams", () => {
    const lines = generateWeakLines("qu", 42, 4);
    expect(lines).toHaveLength(4);
    for (const line of lines) {
      expect(countOccurrences(line, "qu")).toBeGreaterThanOrEqual(MIN_OCCURRENCES_PER_LINE);
      const tokens = line.split(" ");
      expect(tokens).toHaveLength(WEAK_WORDS_PER_LINE);
      for (const token of tokens) {
        expect(LETTER_POOL.has(token)).toBe(true);
      }
    }
  });

  it("builds short code fragments containing symbol n-grams like );, ->, [i and +=", () => {
    for (const ngram of [");", "->", "[i", "+="]) {
      const line = generateWeakLine(ngram, 17);
      expect(countOccurrences(line, ngram)).toBeGreaterThanOrEqual(MIN_OCCURRENCES_PER_LINE);
      expect(/^[\x20-\x7e]+$/.test(line)).toBe(true);
      expect(line.split(" ")).toHaveLength(WEAK_WORDS_PER_LINE);
    }
  });

  it("includes the n-gram at least twice per line and is deterministic for the same seed", () => {
    expect(generateWeakLines("th", 99, 3)).toEqual(generateWeakLines("th", 99, 3));
    expect(weakWordsFrom("->", 7, 0, 2)).toEqual(
      generateWeakLines("->", 7, 2).join(" ").split(" "),
    );
    expect(weakWordsFrom("->", 7, 2, 2)).toEqual(
      generateWeakLines("->", 7, 4).slice(2).join(" ").split(" "),
    );
  });

  it("falls back to printable ASCII tokens for rare n-grams and rejects empty or whitespace n-grams", () => {
    for (const rare of ["qxz", "~@", "A9"]) {
      const line = generateWeakLine(rare, 5);
      expect(countOccurrences(line, rare)).toBeGreaterThanOrEqual(MIN_OCCURRENCES_PER_LINE);
      expect(/^[\x20-\x7e]+$/.test(line)).toBe(true);
    }
    expect(() => generateWeakLine("", 1)).toThrow(RangeError);
    expect(() => generateWeakLine("a b", 1)).toThrow(RangeError);
    expect(countOccurrences("abc", "")).toBe(0);
  });
});
