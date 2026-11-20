import { describe, expect, it } from "vitest";
import { EDIT_CASES, motionOf } from "./cases";
import { pressEditKey, registerView } from "./edit";
import { parseKeys } from "./keys";
import { createState } from "./state";

// AC-5: the engine must agree with Neovim on every edit case: the buffer, the
// cursor and the unnamed register. `npm run vim:oracle` checks the same
// cases against Neovim itself.

const REQUIRED_COMMANDS = [
  // AC-1
  ...["i", "a", "I", "A", "o", "O", "<BS>", "<Esc>"],
  // AC-2
  ...["d", "c", "y", "dd", "cc", "yy", "D", "C", "x", "X", "r", "s", "S", "~", "p", "P", "Y"],
  // AC-3
  ...["iw", "aw", "iW", "aW", "i(", "a(", "ib", "ab", "i{", "a{", "iB", "aB"],
  ...["i[", "a[", "i<", "a<", 'i"', 'a"', "i'", "a'", "i`", "a`"],
  // AC-4
  ...["u", "<C-r>", "dot"],
];

describe("edit fidelity cases", () => {
  it.each(EDIT_CASES.map((c) => [c[0], c] as const))("engine agrees with Neovim: %s", (_, c) => {
    const [, text, from, keys, expected] = c;
    let state = createState(text.split("\n"), { line: from[0], col: from[1] });
    for (const key of parseKeys(keys)) state = pressEditKey(state, key);
    expect(state.lines.join("\n")).toBe(expected.text);
    expect([state.cursor.line, state.cursor.col]).toEqual([...expected.cursor]);
    expect(registerView(state)).toEqual({ reg: expected.reg, regtype: expected.regtype });
    expect(state.mode).toBe("normal");
    expect(state.pending).toEqual([]);
  });

  it.each(REQUIRED_COMMANDS)("command %s has at least 5 cases", (command) => {
    expect(EDIT_CASES.filter((c) => motionOf(c) === command).length).toBeGreaterThanOrEqual(5);
  });

  it("every edit case name is unique", () => {
    const names = EDIT_CASES.map((c) => c[0]);
    expect(new Set(names).size).toBe(names.length);
  });

  it("every edit case starts inside its buffer and ends in normal mode", () => {
    for (const [name, text, from, keys] of EDIT_CASES) {
      const lines = text.split("\n");
      expect(from[0], name).toBeLessThan(lines.length);
      expect(from[1], name).toBeLessThanOrEqual(Math.max(0, (lines[from[0]] ?? "").length - 1));
      expect(parseKeys(keys).length, name).toBeGreaterThan(0);
    }
  });

  it("the cases cover the register after a yank and after a delete", () => {
    const regtypes = new Set(EDIT_CASES.map((c) => c[4].regtype));
    expect(regtypes).toEqual(new Set(["", "v", "V"]));
  });
});
