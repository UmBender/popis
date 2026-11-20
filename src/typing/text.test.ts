import { describe, expect, it } from "vitest";
import { pickQuote } from "./quotes";
import {
  DEFAULT_TEXT_SETTINGS,
  initialWords,
  parseTextSettings,
  textConfigKey,
  textConfigLabel,
  TIME_LOOKAHEAD,
  timeLimitMs,
  wordAt,
  wordsFrom,
  type TextSettings,
} from "./text";
import { wordList } from "./words";

const WORDS_MODE: TextSettings = { ...DEFAULT_TEXT_SETTINGS, mode: "words", wordCount: 25 };

describe("text settings", () => {
  it("default text settings are portuguese, 200 words, 30 s, everything off", () => {
    expect(DEFAULT_TEXT_SETTINGS).toEqual({
      source: "words",
      language: "pt",
      listSize: 200,
      mode: "time",
      seconds: 30,
      wordCount: 25,
      punctuation: false,
      numbers: false,
      lenientAccents: false,
    });
  });

  it("parseTextSettings keeps valid fields", () => {
    const settings: TextSettings = {
      source: "quote",
      language: "en",
      listSize: 1000,
      mode: "words",
      seconds: 120,
      wordCount: 100,
      punctuation: true,
      numbers: true,
      lenientAccents: true,
    };
    expect(parseTextSettings(JSON.parse(JSON.stringify(settings)))).toEqual(settings);
  });

  it("parseTextSettings replaces each invalid field with its default", () => {
    const parsed = parseTextSettings({
      source: "poem",
      language: "en",
      listSize: 500,
      mode: "words",
      seconds: 45,
      wordCount: "10",
      punctuation: 1,
      numbers: true,
    });
    expect(parsed).toEqual({
      ...DEFAULT_TEXT_SETTINGS,
      language: "en",
      mode: "words",
      numbers: true,
    });
  });

  it("parseTextSettings gives the defaults for non-objects", () => {
    for (const value of [undefined, null, 3, "x", [1, 2]]) {
      expect(parseTextSettings(value)).toEqual(DEFAULT_TEXT_SETTINGS);
    }
  });
});

describe("text generation", () => {
  it("wordAt without options picks from the configured list", () => {
    const list = wordList("en", 200);
    for (let i = 0; i < 100; i++) {
      expect(list).toContain(wordAt(7, { ...DEFAULT_TEXT_SETTINGS, language: "en" }, i));
    }
  });

  it("wordAt with numbers turns about 1 in 10 words into 1 to 4 digit numbers", () => {
    const settings = { ...DEFAULT_TEXT_SETTINGS, numbers: true };
    const words = wordsFrom(11, settings, 0, 2000);
    const numbers = words.filter((w) => /^\d+$/.test(w));
    expect(numbers.length).toBeGreaterThan(120);
    expect(numbers.length).toBeLessThan(280);
    for (const n of numbers) expect(n).toMatch(/^[1-9]\d{0,3}$/);
    expect(new Set(numbers.map((n) => n.length))).toEqual(new Set([1, 2, 3, 4]));
  });

  it("wordAt with punctuation uses every mark and capitalizes sentence starts", () => {
    const settings = { ...DEFAULT_TEXT_SETTINGS, punctuation: true };
    const words = wordsFrom(3, settings, 0, 2000);
    const marks = new Set(
      words.map((w) => w.at(-1)).filter((c) => c !== undefined && /[,.?!;:]/.test(c)),
    );
    expect(marks).toEqual(new Set([",", ".", "?", "!", ";", ":"]));
    expect(words[0]?.charAt(0)).toMatch(/\p{Lu}/u);
    const capitalized = words.filter((w) => /^\p{Lu}/u.test(w));
    expect(capitalized.length).toBeGreaterThan(50);
  });

  it("wordsFrom gives the words at consecutive indices", () => {
    const settings = { ...DEFAULT_TEXT_SETTINGS, punctuation: true, numbers: true };
    expect(wordsFrom(9, settings, 5, 3)).toEqual([
      wordAt(9, settings, 5),
      wordAt(9, settings, 6),
      wordAt(9, settings, 7),
    ]);
  });

  it("initialWords in time mode gives the lookahead", () => {
    expect(TIME_LOOKAHEAD).toBe(40);
    expect(initialWords(4, DEFAULT_TEXT_SETTINGS)).toEqual(
      wordsFrom(4, DEFAULT_TEXT_SETTINGS, 0, TIME_LOOKAHEAD),
    );
  });

  it("initialWords in words mode gives the word count", () => {
    expect(initialWords(4, WORDS_MODE)).toEqual(wordsFrom(4, WORDS_MODE, 0, 25));
  });

  it("initialWords of a quote gives its words and ignores punctuation and numbers", () => {
    const settings: TextSettings = {
      ...DEFAULT_TEXT_SETTINGS,
      source: "quote",
      language: "en",
      punctuation: true,
      numbers: true,
    };
    expect(initialWords(4, settings)).toEqual(pickQuote(4, "en").text.split(" "));
  });

  it("timeLimitMs is set only for the time mode of words", () => {
    expect(timeLimitMs({ ...DEFAULT_TEXT_SETTINGS, seconds: 60 })).toBe(60_000);
    expect(timeLimitMs(WORDS_MODE)).toBeNull();
    expect(timeLimitMs({ ...DEFAULT_TEXT_SETTINGS, source: "quote" })).toBeNull();
  });
});

describe("text config", () => {
  it("textConfigKey tells apart the settings that change the test", () => {
    const keys = new Set(
      [
        DEFAULT_TEXT_SETTINGS,
        { ...DEFAULT_TEXT_SETTINGS, language: "en" as const },
        { ...DEFAULT_TEXT_SETTINGS, listSize: 1000 as const },
        { ...DEFAULT_TEXT_SETTINGS, seconds: 60 as const },
        WORDS_MODE,
        { ...WORDS_MODE, wordCount: 50 as const },
        { ...DEFAULT_TEXT_SETTINGS, punctuation: true },
        { ...DEFAULT_TEXT_SETTINGS, numbers: true },
        { ...DEFAULT_TEXT_SETTINGS, lenientAccents: true },
        { ...DEFAULT_TEXT_SETTINGS, source: "quote" as const },
        { ...DEFAULT_TEXT_SETTINGS, source: "quote" as const, language: "en" as const },
      ].map(textConfigKey),
    );
    expect(keys.size).toBe(11);
  });

  it("textConfigKey ignores the settings a mode does not use", () => {
    expect(textConfigKey({ ...DEFAULT_TEXT_SETTINGS, wordCount: 100 })).toBe(
      textConfigKey(DEFAULT_TEXT_SETTINGS),
    );
    expect(textConfigKey({ ...WORDS_MODE, seconds: 120 })).toBe(textConfigKey(WORDS_MODE));
    const quote = { ...DEFAULT_TEXT_SETTINGS, source: "quote" as const };
    expect(
      textConfigKey({ ...quote, listSize: 1000, mode: "words", punctuation: true, numbers: true }),
    ).toBe(textConfigKey(quote));
  });

  it("textConfigLabel describes the settings in portuguese", () => {
    expect(textConfigLabel(DEFAULT_TEXT_SETTINGS)).toBe("palavras · português · 200 · 30 s");
    expect(
      textConfigLabel({
        ...WORDS_MODE,
        language: "en",
        listSize: 1000,
        punctuation: true,
        numbers: true,
        lenientAccents: true,
      }),
    ).toBe("palavras · inglês · 1000 · 25 palavras · pontuação · números · acentos opcionais");
    expect(textConfigLabel({ ...DEFAULT_TEXT_SETTINGS, source: "quote", numbers: true })).toBe(
      "frase · português",
    );
  });
});
