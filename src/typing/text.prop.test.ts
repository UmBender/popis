import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { MAX_SEED } from "../core/rng";
import { DEFAULT_TEXT_SETTINGS, wordAt, type TextSettings } from "./text";
import { LIST_SIZES, TEXT_LANGUAGES, wordList } from "./words";

const seed = fc.integer({ min: 0, max: MAX_SEED });
const index = fc.integer({ min: 0, max: 5000 });
const settings: fc.Arbitrary<TextSettings> = fc.record({
  source: fc.constant("words" as const),
  language: fc.constantFrom(...TEXT_LANGUAGES),
  listSize: fc.constantFrom(...LIST_SIZES),
  mode: fc.constantFrom("time" as const, "words" as const),
  seconds: fc.constant(DEFAULT_TEXT_SETTINGS.seconds),
  wordCount: fc.constant(DEFAULT_TEXT_SETTINGS.wordCount),
  punctuation: fc.boolean(),
  numbers: fc.boolean(),
  lenientAccents: fc.boolean(),
});

const SENTENCE_END = /[.?!]$/;

function undecorate(word: string): string {
  const bare = word.replace(/[,.?!;:]$/, "");
  return bare.charAt(0).toLowerCase() + bare.slice(1);
}

describe("wordAt properties", () => {
  it("same seed, settings and index give the same word", () => {
    fc.assert(
      fc.property(seed, settings, index, (s, t, i) => {
        expect(wordAt(s, t, i)).toBe(wordAt(s, t, i));
      }),
    );
  });

  it("every word is a list word or a 1 to 4 digit number, with at most one mark", () => {
    fc.assert(
      fc.property(seed, settings, index, (s, t, i) => {
        const word = wordAt(s, t, i);
        expect(word).toMatch(/^(\p{L}+|[1-9]\d{0,3})[,.?!;:]?$/u);
        const bare = undecorate(word);
        if (!/^\d/.test(bare)) expect(wordList(t.language, t.listSize)).toContain(bare);
        if (!t.numbers) expect(bare).not.toMatch(/^\d/);
        if (!t.punctuation) expect(word).toBe(bare);
      }),
    );
  });

  it("options only decorate the word the seed picks", () => {
    fc.assert(
      fc.property(seed, settings, index, (s, t, i) => {
        const plain = wordAt(s, { ...t, punctuation: false, numbers: false }, i);
        const numbered = wordAt(s, { ...t, punctuation: false }, i);
        if (!/^\d+$/.test(numbered)) expect(numbered).toBe(plain);
        expect(undecorate(wordAt(s, t, i))).toBe(wordAt(s, { ...t, punctuation: false }, i));
      }),
    );
  });

  it("with punctuation a word is capitalized exactly at sentence starts", () => {
    fc.assert(
      fc.property(seed, settings, index, (s, t, i) => {
        const on = { ...t, punctuation: true };
        const word = wordAt(s, on, i);
        fc.pre(/^\p{L}/u.test(word));
        const start = i === 0 || SENTENCE_END.test(wordAt(s, on, i - 1));
        expect(/^\p{Lu}/u.test(word)).toBe(start);
      }),
    );
  });
});
