import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { MAX_SEED } from "../core/rng";
import { CORPUS, LANGUAGES, pickSnippet } from "./corpus";

const seed = fc.integer({ min: 0, max: MAX_SEED });
const languages = fc.subarray([...LANGUAGES], { minLength: 1 });

describe("pickSnippet properties", () => {
  it("the picked snippet is in the corpus and of a checked language", () => {
    fc.assert(
      fc.property(seed, languages, (s, langs) => {
        const snippet = pickSnippet(s, langs);
        expect(CORPUS).toContain(snippet);
        expect(langs).toContain(snippet.language);
      }),
    );
  });

  it("same seed and languages pick the same snippet", () => {
    fc.assert(
      fc.property(seed, languages, (s, langs) => {
        expect(pickSnippet(s, langs)).toBe(pickSnippet(s, langs));
      }),
    );
  });
});
