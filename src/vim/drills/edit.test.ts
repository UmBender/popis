import { describe, expect, it } from "vitest";
import { pressEditKey } from "../edit";
import { parseKeys } from "../keys";
import { createState } from "../state";
import { EDIT_KIND_LABELS, EDIT_KINDS, generateEdit } from "./edit";

// AC-6: at least 14 kinds of edit, each with a before, a cursor, an after and
// a reference solution. The properties are in edit.prop.test.ts.

describe("edit kinds", () => {
  it("there are at least 14 kinds, each with a label", () => {
    expect(EDIT_KINDS.length).toBeGreaterThanOrEqual(14);
    for (const kind of EDIT_KINDS) expect(EDIT_KIND_LABELS[kind].length).toBeGreaterThan(3);
  });

  it.each(EDIT_KINDS)("kind %s generates an edit for many seeds", (kind) => {
    for (let seed = 1; seed <= 60; seed++) {
      const edit = generateEdit(seed, seed % 7, [kind]);
      expect(edit.kind).toBe(kind);
      expect(edit.after).not.toEqual(edit.lines);
      expect(edit.referenceKeys).toBe(parseKeys(edit.reference).length);
      expect(edit.start.line).toBeLessThan(edit.lines.length);
      expect(edit.start.col).toBeLessThanOrEqual((edit.lines[edit.start.line] ?? "").length);
    }
  });

  it("the reference turns the before into the after", () => {
    const edit = generateEdit(7, 0, ["append-semicolon"]);
    let state = createState(edit.lines, edit.start);
    for (const key of parseKeys(edit.reference)) state = pressEditKey(state, key);
    expect(state.lines).toEqual(edit.after);
    expect(state.mode).toBe("normal");
  });

  it("only the chosen kinds are generated, and all of them with the full list", () => {
    const some = new Set<string>();
    const all = new Set<string>();
    for (let seed = 1; seed <= 200; seed++) {
      some.add(generateEdit(seed, 0, ["delete-line", "swap-lines"]).kind);
      all.add(generateEdit(seed, 0, EDIT_KINDS).kind);
    }
    expect([...some].sort()).toEqual(["delete-line", "swap-lines"]);
    expect(all.size).toBeGreaterThanOrEqual(14);
  });

  it("an empty selection of kinds is an error", () => {
    expect(() => generateEdit(1, 0, [])).toThrow();
  });

  it("the edit index changes the edit, the same index repeats it", () => {
    expect(generateEdit(3, 1, EDIT_KINDS)).toEqual(generateEdit(3, 1, EDIT_KINDS));
    const seen = new Set(
      Array.from({ length: 10 }, (_, i) => JSON.stringify(generateEdit(3, i, EDIT_KINDS))),
    );
    expect(seen.size).toBeGreaterThan(5);
  });
});
