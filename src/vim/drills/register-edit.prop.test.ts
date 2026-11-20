import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { MAX_SEED } from "../../core/rng";
import { pressEditKey } from "../edit";
import { parseKeys } from "../keys";
import { createState } from "../state";
import { generateEdit } from "./edit";
import { REGISTER_KINDS } from "./register-edit";

// AC-5: for many seeds and every register kind, the reference solution applied
// to the before gives exactly the after, and the same seed gives the same edit.

const argsArb = fc.record({
  seed: fc.integer({ min: 0, max: MAX_SEED }),
  index: fc.nat(50),
});

describe.each(REGISTER_KINDS)("generateEdit register properties: %s", (kind) => {
  it("the reference solution gives the after", () => {
    fc.assert(
      fc.property(argsArb, ({ seed, index }) => {
        const edit = generateEdit(seed, index, [kind]);
        let state = createState(edit.lines, edit.start);
        for (const key of parseKeys(edit.reference)) state = pressEditKey(state, key);
        expect(state.lines).toEqual(edit.after);
        expect(state.mode).toBe("normal");
      }),
    );
  });

  it("the edit respects its limits", () => {
    fc.assert(
      fc.property(argsArb, ({ seed, index }) => {
        const edit = generateEdit(seed, index, [kind]);
        expect(edit.lines.length).toBeLessThanOrEqual(15);
        expect(edit.after.length).toBeLessThanOrEqual(16);
        expect(edit.lines.join("\n")).not.toBe(edit.after.join("\n"));
        expect(edit.referenceKeys).toBeGreaterThanOrEqual(1);
        expect(edit.referenceKeys).toBeLessThanOrEqual(40);
      }),
    );
  });

  it("the same seed gives the same edit", () => {
    fc.assert(
      fc.property(argsArb, ({ seed, index }) => {
        expect(generateEdit(seed, index, [kind])).toEqual(generateEdit(seed, index, [kind]));
      }),
    );
  });
});
