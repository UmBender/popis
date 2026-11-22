import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { countOccurrences, generateWeakLine, MIN_OCCURRENCES_PER_LINE } from "./weak-text";

const printableNonSpaceChar = fc
  .integer({ min: 0x21, max: 0x7e })
  .map((c) => String.fromCharCode(c));
const ngramArb = fc
  .array(printableNonSpaceChar, { minLength: 1, maxLength: 3 })
  .map((chars) => chars.join(""));

describe("weak-text properties", () => {
  it("generated text contains the n-gram at least twice, is printable ASCII and deterministic", () => {
    fc.assert(
      fc.property(ngramArb, fc.integer({ min: 0, max: 0xffffffff }), (ngram, seed) => {
        const line = generateWeakLine(ngram, seed);
        expect(countOccurrences(line, ngram)).toBeGreaterThanOrEqual(MIN_OCCURRENCES_PER_LINE);
        expect(/^[\x20-\x7e]+$/.test(line)).toBe(true);
        expect(generateWeakLine(ngram, seed)).toBe(line);
      }),
    );
  });
});
