import { describe, expect, it } from "vitest";
import { motionOf, VISUAL_CASES } from "./cases";
import { pressEditKey, registerView } from "./edit";
import { parseKeys } from "./keys";
import { createState } from "./state";

// AC-5: the engine must agree with Neovim on every visual, shift, join and
// `:s` case: the buffer, the cursor and the unnamed register (a block register
// included). `npm run vim:oracle` checks the same cases against Neovim itself.

const REQUIRED_COMMANDS = [
  // AC-1
  ...["v", "V", "<C-v>", "o", "vd", "vc", "vy", "v>", "v<", "v~", "vr", "gv"],
  // AC-2
  ...["<C-v>I", "<C-v>A", "$A"],
  // AC-3
  ...[">>", "<<", "J"],
  // AC-4
  ...[":s", ":s%", ":s visual", ":s range", ":noh"],
];

describe("visual fidelity cases", () => {
  it.each(VISUAL_CASES.map((c) => [c[0], c] as const))("engine agrees with Neovim: %s", (_, c) => {
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
    expect(VISUAL_CASES.filter((c) => motionOf(c) === command).length).toBeGreaterThanOrEqual(5);
  });

  it("every visual case name is unique", () => {
    const names = VISUAL_CASES.map((c) => c[0]);
    expect(new Set(names).size).toBe(names.length);
  });

  it("every visual case starts inside its buffer", () => {
    for (const [name, text, from, keys] of VISUAL_CASES) {
      const lines = text.split("\n");
      expect(from[0], name).toBeLessThan(lines.length);
      expect(from[1], name).toBeLessThanOrEqual(Math.max(0, (lines[from[0]] ?? "").length - 1));
      expect(parseKeys(keys).length, name).toBeGreaterThan(0);
    }
  });

  it("the cases cover characters, lines and block registers", () => {
    const kinds = new Set(VISUAL_CASES.map((c) => c[4].regtype.slice(0, 1)));
    expect(kinds).toEqual(new Set(["", "v", "V", "\x16"]));
  });
});
