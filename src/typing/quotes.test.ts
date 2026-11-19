import { describe, expect, it } from "vitest";
import { pickQuote, QUOTES } from "./quotes";
import { TEXT_LANGUAGES } from "./words";

describe("quotes", () => {
  it("quotes have at least 20 per language", () => {
    for (const language of TEXT_LANGUAGES) {
      expect(QUOTES.filter((q) => q.language === language).length).toBeGreaterThanOrEqual(20);
    }
  });

  it("quotes have between 10 and 60 words separated by single spaces", () => {
    for (const quote of QUOTES) {
      const words = quote.text.split(" ");
      expect(words.length, quote.id).toBeGreaterThanOrEqual(10);
      expect(words.length, quote.id).toBeLessThanOrEqual(60);
      expect(
        words.every((w) => w.length > 0),
        quote.id,
      ).toBe(true);
      expect(quote.text, quote.id).toMatch(/^\S.*[.!?]$/u);
    }
  });

  it("quotes have unique ids prefixed by their language", () => {
    expect(new Set(QUOTES.map((q) => q.id)).size).toBe(QUOTES.length);
    for (const quote of QUOTES) expect(quote.id.startsWith(`${quote.language}-`)).toBe(true);
  });

  it("english quotes are ascii only", () => {
    for (const quote of QUOTES.filter((q) => q.language === "en")) {
      expect(quote.text, quote.id).toMatch(/^[\x20-\x7e]+$/);
    }
  });

  it("pickQuote returns a quote of the language and is stable per seed", () => {
    for (const language of TEXT_LANGUAGES) {
      for (let seed = 0; seed < 50; seed++) {
        const quote = pickQuote(seed, language);
        expect(quote.language).toBe(language);
        expect(pickQuote(seed, language)).toBe(quote);
      }
    }
  });

  it("pickQuote reaches several quotes", () => {
    const ids = new Set(Array.from({ length: 200 }, (_, seed) => pickQuote(seed, "pt").id));
    expect(ids.size).toBeGreaterThan(10);
  });
});
