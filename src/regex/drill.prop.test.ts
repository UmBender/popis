import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { checkCasar, checkExtrair, checkLer, checkTrocar, editDistance } from "./check";
import { compile, REGEX_DIALECTS } from "./compile";
import { generateRegexItem } from "./drill";
import { REGEX_ITEM_KINDS } from "./types";

// T45 AC-3: property tests for the regex drill generator.
// Checks canonical separation in both dialects, >= 3 lines per list,
// at least one negative at edit distance 1 from a positive, and seed determinism.

const seedArb = fc.integer({ min: 0, max: 0xffffffff });
const indexArb = fc.integer({ min: 0, max: 50 });

describe("regex drill generator (property)", () => {
  for (const kind of REGEX_ITEM_KINDS) {
    for (const dialect of REGEX_DIALECTS) {
      it(`generates valid deterministic ${kind} items in ${dialect}`, () => {
        fc.assert(
          fc.property(seedArb, indexArb, (seed, index) => {
            const item = generateRegexItem(seed, index, dialect, [kind]);
            const again = generateRegexItem(seed, index, dialect, [kind]);
            expect(item).toEqual(again);
            expect(item.kind).toBe(kind);
            expect(item.kc).toBe(`regex.${kind}`);
            expect(item.dialect).toBe(dialect);

            if (item.kind === "casar") {
              expect(item.positive.length).toBeGreaterThanOrEqual(3);
              expect(item.negative.length).toBeGreaterThanOrEqual(3);

              // At least one negative is at edit distance 1 from a positive.
              const hasDist1 = item.negative.some((neg) =>
                item.positive.some((pos) => editDistance(pos, neg) === 1),
              );
              expect(hasDist1).toBe(true);

              // Canonical separates both lists in both dialects.
              for (const d of REGEX_DIALECTS) {
                const res = checkCasar(item.canonicalByDialect[d], { ...item, dialect: d });
                expect(res.ok && res.allPassed, `${item.family} in ${d}`).toBe(true);
              }
            } else if (item.kind === "extrair") {
              expect(item.cases.length).toBeGreaterThanOrEqual(3);
              for (const d of REGEX_DIALECTS) {
                const res = checkExtrair(item.canonicalByDialect[d], { ...item, dialect: d });
                expect(res.ok && res.allPassed, `${item.family} in ${d}`).toBe(true);
              }
            } else if (item.kind === "trocar") {
              expect(item.cases.length).toBeGreaterThanOrEqual(3);
              for (const d of REGEX_DIALECTS) {
                const c = item.canonicalByDialect[d];
                const res = checkTrocar(c.pattern, c.replacement, { ...item, dialect: d });
                expect(res.ok && res.allPassed, `${item.family} in ${d}`).toBe(true);
              }
            } else {
              expect(item.lines).toHaveLength(5);
              expect(item.expected).toHaveLength(5);
              const compiled = compile(item.pattern, item.dialect, item.mode);
              expect(compiled.ok).toBe(true);
              if (compiled.ok) {
                expect(item.lines.map((l) => compiled.matcher.test(l))).toEqual(item.expected);
              }
              expect(item.expected.some(Boolean)).toBe(true);
              expect(item.expected.some((v) => !v)).toBe(true);
              expect(checkLer(item.expected, item).allPassed).toBe(true);
            }
          }),
        );
      });
    }
  }
});
