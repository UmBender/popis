import { describe, expect, it } from "vitest";
import { pressEditKey } from "../edit";
import { parseKeys } from "../keys";
import { createState } from "../state";
import { EDIT_KIND_LABELS, EDIT_KINDS, generateEdit, type EditKind } from "./edit";

// AC-6: the kinds of edit that use the visual mode, `:s`, `>`, `<` and `J`.
// The property that the reference gives the after is in edit.prop.test.ts,
// which runs over every kind.

const NEW_KINDS: readonly [EditKind, RegExp][] = [
  ["comment-block", /^0<C-v>\d?j+I(\/\/|#) <Esc>$/],
  ["uncomment-block", /^0<C-v>\d?j+l*d$/],
  ["rename-variable", /^:%s\/\\<lt>\w+\\>\/\w+\/g<CR>$/],
  ["rename-in-function", /^vi\{:s\/\\<lt>\w+\\>\/\w+\/g<CR>$/],
  ["indent-block", /^>i\{$/],
  ["dedent-block", /^<lt>i\{$/],
  ["indent-lines", /^V\d?j>$/],
  ["join-lines", /^J$/],
  ["append-semicolons", /^<C-v>\d?j\$A;<Esc>$/],
  ["replace-endl", /^:%s\/endl\/'\\\\n'\/g<CR>$/],
];

describe("visual edit kinds", () => {
  it("there are at least 8 new kinds, all listed and labelled", () => {
    expect(NEW_KINDS.length).toBeGreaterThanOrEqual(8);
    for (const [kind] of NEW_KINDS) {
      expect(EDIT_KINDS).toContain(kind);
      expect(EDIT_KIND_LABELS[kind].length).toBeGreaterThan(3);
    }
  });

  it.each(NEW_KINDS)("kind %s writes its reference the way the note says", (kind, shape) => {
    for (let seed = 1; seed <= 40; seed++) {
      const edit = generateEdit(seed, seed % 5, [kind]);
      expect(edit.kind).toBe(kind);
      expect(edit.reference, `seed ${String(seed)}`).toMatch(shape);
      let state = createState(edit.lines, edit.start);
      for (const key of parseKeys(edit.reference)) state = pressEditKey(state, key);
      expect(state.lines).toEqual(edit.after);
      expect(state.mode).toBe("normal");
    }
  });

  it("the block kinds use a block of 3 to 6 lines when commenting", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const edit = generateEdit(seed, 0, ["comment-block"]);
      const changed = edit.after.filter((line, i) => line !== edit.lines[i]);
      expect(changed.length).toBeGreaterThanOrEqual(3);
      expect(changed.length).toBeLessThanOrEqual(6);
    }
  });

  it("rename-in-function leaves the lines outside the block alone", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const edit = generateEdit(seed, 1, ["rename-in-function"]);
      const changed = edit.after.map((line, i) => line !== edit.lines[i]);
      expect(changed.some(Boolean)).toBe(true);
      expect(changed[0]).toBe(false);
    }
  });
});
