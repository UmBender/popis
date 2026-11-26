import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { casesForClasses } from "./cases";
import { WA_CLASSES, isWaClass, type WaClass } from "./classes";
import { checkWaAnswer, generateWaItem } from "./drill";

// T41 AC-3: property tests for WA hunt drill generation, non-repetition, 4 class choices and checking.

const classSubsetArb = fc
  .subarray([...WA_CLASSES], { minLength: 1 })
  .map((c): readonly WaClass[] => c);

describe("wa drill properties (AC-3)", () => {
  it("canonical answer is accepted and near-misses are rejected", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 0xffffffff }),
        fc.integer({ min: 0, max: 64 }),
        classSubsetArb,
        (seed, index, classes) => {
          const item = generateWaItem(seed, index, classes);
          const ok = checkWaAnswer(item, {
            line: item.caseData.line,
            bugClass: item.caseData.class,
          });
          expect(ok).toEqual({ ok: true, lineOk: true, classOk: true });

          const wrongChoice = item.choices.find((c) => c.id !== item.caseData.class)!;
          const badClass = checkWaAnswer(item, {
            line: item.caseData.line,
            bugClass: wrongChoice.id,
          });
          expect(badClass).toEqual({ ok: false, lineOk: true, classOk: false });

          const wrongLine = item.caseData.line === 1 ? 2 : item.caseData.line - 1;
          const badLine = checkWaAnswer(item, {
            line: wrongLine,
            bugClass: item.caseData.class,
          });
          expect(badLine).toEqual({ ok: false, lineOk: false, classOk: true });

          const bothWrong = checkWaAnswer(item, {
            line: wrongLine,
            bugClass: wrongChoice.id,
          });
          expect(bothWrong).toEqual({ ok: false, lineOk: false, classOk: false });
        },
      ),
    );
  });

  it("correct class is always among 4 distinct choices", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 0xffffffff }),
        fc.integer({ min: 0, max: 64 }),
        classSubsetArb,
        (seed, index, classes) => {
          const item = generateWaItem(seed, index, classes);
          expect(classes).toContain(item.bugClass);
          expect(item.kc).toBe(`wa.${item.bugClass}`);
          expect(item.choices).toHaveLength(4);
          const ids = item.choices.map((c) => c.id);
          expect(new Set(ids).size).toBe(4);
          for (const id of ids) expect(isWaClass(id)).toBe(true);
          expect(item.choices[item.correctChoiceIndex - 1]?.id).toBe(item.caseData.class);
        },
      ),
    );
  });

  it("no case repeats before exhausting the filtered pool", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 0xffffffff }), classSubsetArb, (seed, classes) => {
        const pool = casesForClasses(classes);
        const seen = new Set<string>();
        for (let i = 0; i < pool.length; i++) {
          const item = generateWaItem(seed, i, classes);
          expect(seen.has(item.caseData.id)).toBe(false);
          seen.add(item.caseData.id);
        }
        expect(seen.size).toBe(pool.length);
      }),
    );
  });

  it("same seed produces the same sequence", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 0xffffffff }), classSubsetArb, (seed, classes) => {
        const a = Array.from({ length: 5 }, (_, i) => generateWaItem(seed, i, classes));
        const b = Array.from({ length: 5 }, (_, i) => generateWaItem(seed, i, classes));
        expect(a).toEqual(b);
      }),
    );
  });
});
