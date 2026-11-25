import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { checkStlAnswer } from "./check";
import { generateStlItem, STL_LEVEL_MODELS, STL_LEVELS, STL_MODELS, type StlModel } from "./drill";

// T42 AC-2 property tests: every level uses only its own models, snippets stay <= 8 lines,
// canonical answer is accepted by the checker, and generation is deterministic by seed.

describe("stl drill generator properties (AC-2)", () => {
  it("partitions all models across levels 1..4 without duplicates", () => {
    const all = STL_LEVELS.flatMap((lv) => STL_LEVEL_MODELS[lv]);
    expect(new Set(all).size).toBe(all.length);
    expect(new Set(all)).toEqual(new Set(STL_MODELS));
    for (const lv of STL_LEVELS) {
      expect(STL_LEVEL_MODELS[lv].length).toBeGreaterThanOrEqual(4);
    }
  });

  for (const level of STL_LEVELS) {
    it(`level ${String(level)} only emits its own models, respects <= 8 lines and is deterministic`, () => {
      const allowed = new Set<StlModel>(STL_LEVEL_MODELS[level]);
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 0x7fffffff }),
          fc.integer({ min: 0, max: 50 }),
          (seed, index) => {
            const item = generateStlItem(seed, index, level);
            expect(item.level).toBe(level);
            expect(allowed.has(item.model)).toBe(true);
            expect(item.kc).toBe(`stl.${item.model}`);
            expect(item.lines.length).toBeGreaterThanOrEqual(1);
            expect(item.lines.length).toBeLessThanOrEqual(8);
            expect(item.canonical.trim().length).toBeGreaterThan(0);
            expect(item.explanation.length).toBeGreaterThan(10);

            const checked = checkStlAnswer(item.canonical, item.canonical, {
              boolalpha: item.boolalpha,
            });
            expect(checked.ok, `${item.model} seed=${String(seed)}`).toBe(true);

            const again = generateStlItem(seed, index, level);
            expect(again).toEqual(item);
          },
        ),
      );
    });
  }

  for (const level of STL_LEVELS) {
    for (const model of STL_LEVEL_MODELS[level]) {
      it(`model "${model}" (L${String(level)}) generates valid deterministic items`, () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 0, max: 0x7fffffff }),
            fc.integer({ min: 0, max: 20 }),
            (seed, index) => {
              const item = generateStlItem(seed, index, level, [model]);
              expect(item.model).toBe(model);
              expect(item.kc).toBe(`stl.${model}`);
              expect(item.lines.length).toBeLessThanOrEqual(8);
              expect(
                checkStlAnswer(item.canonical, item.canonical, { boolalpha: item.boolalpha }).ok,
              ).toBe(true);
              expect(generateStlItem(seed, index, level, [model])).toEqual(item);
            },
          ),
        );
      });
    }
  }
});
