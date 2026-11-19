import { describe, expect, it } from "vitest";
import { LIST_SIZES, TEXT_LANGUAGES, WORDS, wordList } from "./words";

describe("word lists", () => {
  it("word lists have 1000 words for each language", () => {
    expect(TEXT_LANGUAGES).toEqual(["pt", "en"]);
    for (const language of TEXT_LANGUAGES) expect(WORDS[language]).toHaveLength(1000);
  });

  it("word lists hold unique lowercase words without spaces or punctuation", () => {
    for (const language of TEXT_LANGUAGES) {
      const words = WORDS[language];
      expect(new Set(words).size).toBe(words.length);
      for (const word of words) expect(word).toMatch(/^\p{Ll}+$/u);
    }
  });

  it("portuguese list has accents and english list is ascii only", () => {
    expect(WORDS.pt).toEqual(expect.arrayContaining(["não", "você", "é"]));
    for (const word of WORDS.en) expect(word).toMatch(/^[a-z]+$/);
  });

  it("word list of size 200 is the first 200 words", () => {
    expect(LIST_SIZES).toEqual([200, 1000]);
    for (const language of TEXT_LANGUAGES) {
      expect(wordList(language, 200)).toEqual(WORDS[language].slice(0, 200));
      expect(wordList(language, 1000)).toEqual(WORDS[language]);
    }
  });
});
