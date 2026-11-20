import { describe, expect, it } from "vitest";
import { REGISTER_CASES, motionOf } from "./cases";
import { pressEditKey, registerView } from "./edit";
import { parseKeys } from "./keys";
import { registersView } from "./registers";
import { createState } from "./state";

// AC-4: the engine must agree with Neovim on every register case: the buffer,
// the cursor, the unnamed register and every other register left behind.
// `npm run vim:oracle` checks the same cases against Neovim itself.

const REQUIRED_COMMANDS = [
  ...['"ay', '"ad', '"ap', '"Ay', '"_d', '"0p', '"1p', '"-p'],
  ...["q", "@a", "@@", "<C-a>", "<C-x>", "i_<C-r>"],
];

describe("register fidelity cases", () => {
  it.each(REGISTER_CASES.map((c) => [c[0], c] as const))(
    "engine agrees with Neovim: %s",
    (_, c) => {
      const [, text, from, keys, expected] = c;
      let state = createState(text.split("\n"), { line: from[0], col: from[1] });
      for (const key of parseKeys(keys)) state = pressEditKey(state, key);
      expect(state.lines.join("\n")).toBe(expected.text);
      expect([state.cursor.line, state.cursor.col]).toEqual([...expected.cursor]);
      expect(registerView(state)).toEqual({ reg: expected.reg, regtype: expected.regtype });
      expect(registersView(state)).toEqual(expected.regs);
      expect(state.mode).toBe("normal");
      expect(state.pending).toEqual([]);
    },
  );

  it.each(REQUIRED_COMMANDS)("command %s has at least 5 cases", (command) => {
    expect(REGISTER_CASES.filter((c) => motionOf(c) === command).length).toBeGreaterThanOrEqual(5);
  });

  it("every register case name is unique", () => {
    const names = REGISTER_CASES.map((c) => c[0]);
    expect(new Set(names).size).toBe(names.length);
  });

  it("every register case starts inside its buffer", () => {
    for (const [name, text, from, keys] of REGISTER_CASES) {
      const lines = text.split("\n");
      expect(from[0], name).toBeLessThan(lines.length);
      expect(from[1], name).toBeLessThanOrEqual(Math.max(0, (lines[from[0]] ?? "").length - 1));
      expect(parseKeys(keys).length, name).toBeGreaterThan(0);
    }
  });

  it("the cases leave named, numbered, small delete and macro registers behind", () => {
    const names = new Set(REGISTER_CASES.flatMap((c) => Object.keys(c[4].regs)));
    for (const name of ["0", "1", "2", "9", "-", "a", "b"]) expect(names.has(name)).toBe(true);
  });
});
