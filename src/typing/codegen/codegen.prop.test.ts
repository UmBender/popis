import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { MAX_SEED } from "../../core/rng";
import { LANGUAGES } from "../corpus";
import { generateCode, generateCodeSnippet } from "./index";

const seedArb = fc.integer({ min: 0, max: MAX_SEED });
const langArb = fc.constantFrom(...LANGUAGES);
const langsArb = fc.subarray([...LANGUAGES], { minLength: 1 });

const OPENERS = new Set(["(", "[", "{"]);
const MATCHING: Readonly<Record<string, string>> = { ")": "(", "]": "[", "}": "{" };

function hasBalancedDelimiters(code: string): boolean {
  const stack: string[] = [];
  let quote: string | null = null;
  for (let i = 0; i < code.length; i++) {
    const ch = code[i] as string;
    if (quote !== null) {
      if (ch === "\\") {
        i++;
      } else if (ch === quote) {
        quote = null;
      }
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
    } else if (OPENERS.has(ch)) {
      stack.push(ch);
    } else if (ch in MATCHING) {
      if (stack.pop() !== MATCHING[ch]) return false;
    }
  }
  return quote === null && stack.length === 0;
}

describe("codegen properties", () => {
  it("generated code obeys the T10 formatting rules", () => {
    fc.assert(
      fc.property(seedArb, langArb, (seed, language) => {
        const snippet = generateCode(seed, language);
        const lines = snippet.text.split("\n");
        expect(lines.length).toBeGreaterThanOrEqual(3);
        expect(lines.length).toBeLessThanOrEqual(12);
        expect(lines[0]).toMatch(/^\S/);
        for (const line of lines) {
          expect(line).toMatch(/^[\x20-\x7e]+$/);
          expect(line.length).toBeLessThanOrEqual(60);
          expect(line).not.toMatch(/\s$/);
          const indent = /^ */.exec(line)?.[0].length ?? 0;
          expect(indent % 4).toBe(0);
        }
      }),
    );
  });

  it("the same seed and language always generate the same snippet", () => {
    fc.assert(
      fc.property(seedArb, langArb, (seed, language) => {
        expect(generateCode(seed, language)).toEqual(generateCode(seed, language));
      }),
    );
  });

  it("generated code has balanced parentheses, brackets and braces", () => {
    fc.assert(
      fc.property(seedArb, langArb, (seed, language) => {
        const snippet = generateCode(seed, language);
        expect(hasBalancedDelimiters(snippet.text), snippet.text).toBe(true);
      }),
    );
  });

  it("generateCodeSnippet always returns a selected language and matches generateCode", () => {
    fc.assert(
      fc.property(seedArb, langsArb, (seed, languages) => {
        const snippet = generateCodeSnippet(seed, languages);
        expect(languages).toContain(snippet.language);
        expect(snippet).toEqual(generateCode(seed, snippet.language));
      }),
    );
  });
});
