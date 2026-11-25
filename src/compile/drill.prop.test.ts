import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { casesForGroups } from "./cases";
import { COMPILE_GROUPS, causeById, type CompileGroup } from "./causes";
import { checkCompileAnswer, generateCompileItem } from "./drill";

// T40 AC-2: property tests for drill generation, non-repetition, choice shuffling and checking.

const groupSubsetArb = fc
  .subarray([...COMPILE_GROUPS], { minLength: 1 })
  .map((g): readonly CompileGroup[] => g);

describe("compile drill properties (AC-2)", () => {
  it("canonical answer is accepted and near-misses are rejected", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 0xffffffff }),
        fc.integer({ min: 0, max: 60 }),
        groupSubsetArb,
        (seed, index, groups) => {
          const item = generateCompileItem(seed, index, groups);
          const ok = checkCompileAnswer(item, {
            line: item.caseData.line,
            cause: item.caseData.cause,
          });
          expect(ok).toEqual({ ok: true, lineOk: true, causeOk: true });

          const wrongCause = item.choices.find((c) => c.id !== item.caseData.cause)!;
          const badCause = checkCompileAnswer(item, {
            line: item.caseData.line,
            cause: wrongCause.id,
          });
          expect(badCause).toEqual({ ok: false, lineOk: true, causeOk: false });

          const wrongLine = item.caseData.line === 1 ? 2 : item.caseData.line - 1;
          const badLine = checkCompileAnswer(item, {
            line: wrongLine,
            cause: item.caseData.cause,
          });
          expect(badLine).toEqual({ ok: false, lineOk: false, causeOk: true });

          const bothWrong = checkCompileAnswer(item, {
            line: wrongLine,
            cause: wrongCause.id,
          });
          expect(bothWrong).toEqual({ ok: false, lineOk: false, causeOk: false });
        },
      ),
    );
  });

  it("correct cause is always among the 4 distinct choices from the same group", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 0xffffffff }),
        fc.integer({ min: 0, max: 40 }),
        groupSubsetArb,
        (seed, index, groups) => {
          const item = generateCompileItem(seed, index, groups);
          expect(groups).toContain(item.group);
          expect(item.kc).toBe(`compile.${item.group}`);
          expect(item.choices).toHaveLength(4);
          const ids = item.choices.map((c) => c.id);
          expect(new Set(ids).size).toBe(4);
          for (const choice of item.choices) {
            expect(causeById(choice.id).group).toBe(item.group);
          }
          expect(item.choices[item.correctChoiceIndex - 1]?.id).toBe(item.caseData.cause);
        },
      ),
    );
  });

  it("no case repeats before exhausting the filtered pool", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 0xffffffff }), groupSubsetArb, (seed, groups) => {
        const pool = casesForGroups(groups);
        const seen = new Set<string>();
        for (let i = 0; i < pool.length; i++) {
          const item = generateCompileItem(seed, i, groups);
          expect(seen.has(item.caseData.id)).toBe(false);
          seen.add(item.caseData.id);
        }
        expect(seen.size).toBe(pool.length);
      }),
    );
  });

  it("same seed produces the same round", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 0xffffffff }), groupSubsetArb, (seed, groups) => {
        const a = Array.from({ length: 6 }, (_, i) => generateCompileItem(seed, i, groups));
        const b = Array.from({ length: 6 }, (_, i) => generateCompileItem(seed, i, groups));
        expect(a).toEqual(b);
      }),
    );
  });
});
