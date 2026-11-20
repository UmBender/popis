import { describe, expect, it } from "vitest";
import { pressEditKey } from "../edit";
import { parseKeys } from "../keys";
import { createState } from "../state";
import { ALL_EDIT_KINDS, EDIT_KIND_LABELS, EDIT_KINDS, generateEdit } from "./edit";
import { REGISTER_KINDS, type RegisterKind } from "./register-edit";

// AC-5: the kinds of edit that use registers, macros and <C-a>. The property
// that the reference gives the after is in register-edit.prop.test.ts.

const SHAPES: readonly [RegisterKind, RegExp][] = [
  ["number-lines", /^qayyp<C-a>q\d*@a$/],
  ["copy-block", /^"a2yy\d*"ap$/],
  ["array-initializer", /^:s\/ \/, \/g<CR>I\{<Esc>A\}<Esc>$/],
  ["declarations-to-cin", /^qa0cwcin >><Esc>jq\d*@a$/],
  ["swap-columns", /^qa0dwA <C-r>"<BS><Esc>j0q\d*@a$/],
  ["delete-debug-line", /^yy\d*j"_ddp$/],
  ["paste-saved-text", /^"ayyjdd"apj"ap$/],
  ["increment-indexes", /^<C-a>(j\.)+$/],
];

describe("register edit kinds", () => {
  it("there are at least 8 kinds, all labelled and kept apart from the older ones", () => {
    expect(SHAPES.length).toBeGreaterThanOrEqual(8);
    expect(REGISTER_KINDS).toEqual(SHAPES.map(([kind]) => kind));
    for (const kind of REGISTER_KINDS) {
      expect(EDIT_KIND_LABELS[kind].length).toBeGreaterThan(3);
      expect(ALL_EDIT_KINDS).toContain(kind);
      expect(EDIT_KINDS as readonly string[]).not.toContain(kind);
    }
  });

  it.each(SHAPES)("kind %s writes its reference the way the note says", (kind, shape) => {
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

  it("number-lines starts from 1 and counts up to the last line", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const edit = generateEdit(seed, 0, ["number-lines"]);
      expect(edit.lines).toEqual(["1"]);
      expect(edit.after).toEqual(edit.after.map((_, i) => String(i + 1)));
      expect(edit.after.length).toBeGreaterThanOrEqual(4);
    }
  });

  it("the macro kinds use a macro and the others do not", () => {
    for (const [kind] of SHAPES) {
      const edit = generateEdit(7, 0, [kind]);
      const macro = ["number-lines", "declarations-to-cin", "swap-columns"].includes(kind);
      expect(edit.reference.includes("@a"), kind).toBe(macro);
    }
  });

  it("delete-debug-line leaves the yanked line pasted and the debug line gone", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const edit = generateEdit(seed, 0, ["delete-debug-line"]);
      const debug = edit.lines.filter((line) => line.includes("cerr"));
      expect(debug).toHaveLength(1);
      expect(edit.after.some((line) => line.includes("cerr"))).toBe(false);
      expect(edit.after.length).toBe(edit.lines.length);
    }
  });
});
