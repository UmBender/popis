import { describe, expect, it } from "vitest";
import { ALL_CASES, motionOf } from "./cases";
import { pressKey } from "./engine";
import { parseKeys } from "./keys";
import { createState } from "./state";

// AC-3: the engine must agree with the cursor Neovim gives on every case.
// `npm run vim:oracle` checks the same cases against Neovim itself.

const REQUIRED_MOTIONS = [
  ...["h", "j", "k", "l", "w", "b", "e", "W", "B", "E", "ge", "0", "^", "$"],
  ...["f", "F", "t", "T", ";", ",", "gg", "G", "nG", "{", "}", "%", "/", "?", "n", "N", "*", "#"],
];

describe("fidelity cases", () => {
  it.each(ALL_CASES.map((c) => [c[0], c] as const))("engine agrees with Neovim: %s", (_, c) => {
    const [, text, from, keys, expected] = c;
    let state = createState(text.split("\n"), { line: from[0], col: from[1] });
    for (const key of parseKeys(keys)) state = pressKey(state, key, 7).state;
    expect([state.cursor.line, state.cursor.col]).toEqual([...expected]);
    expect(state.pending).toEqual([]);
  });

  it.each(REQUIRED_MOTIONS)("motion %s has at least 5 cases", (motion) => {
    expect(ALL_CASES.filter((c) => motionOf(c) === motion).length).toBeGreaterThanOrEqual(5);
  });

  it("every case name is unique", () => {
    const names = ALL_CASES.map((c) => c[0]);
    expect(new Set(names).size).toBe(names.length);
  });

  it("every case starts inside its buffer", () => {
    for (const [name, text, from] of ALL_CASES) {
      const lines = text.split("\n");
      expect(from[0], name).toBeLessThan(lines.length);
      expect(from[1], name).toBeLessThanOrEqual(Math.max(0, (lines[from[0]] ?? "").length - 1));
    }
  });
});
