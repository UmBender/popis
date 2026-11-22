import { describe, expect, it } from "vitest";
import { CODE_WORDS } from "./code-words";

describe("code-words", () => {
  it("code words list is unique, non-empty, printable ASCII and has no whitespace", () => {
    expect(CODE_WORDS.length).toBeGreaterThanOrEqual(150);
    expect(new Set(CODE_WORDS).size).toBe(CODE_WORDS.length);
    for (const word of CODE_WORDS) {
      expect(word.length).toBeGreaterThan(0);
      expect(/\s/.test(word)).toBe(false);
      expect(/^[\x21-\x7e]+$/.test(word)).toBe(true);
    }
  });
});
