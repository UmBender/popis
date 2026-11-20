import { describe, expect, it } from "vitest";
import { pressEditKey } from "./edit";
import { parseKeys } from "./keys";
import { createState, type VimState } from "./state";

// AC-3: <C-a> and <C-x> on the next number of the line. The cases against
// Neovim are in register-cases.test.ts.

function run(text: string, keys: string, col = 0): VimState {
  let state = createState(text.split("\n"), { line: 0, col });
  for (const key of parseKeys(keys)) state = pressEditKey(state, key);
  return state;
}

describe("increment", () => {
  it("<C-a> adds one to the first number at or after the cursor", () => {
    expect(run("a 5 b 6", "<C-a>").lines).toEqual(["a 6 b 6"]);
    expect(run("a 5 b 6", "<C-a>", 4).lines).toEqual(["a 5 b 7"]);
  });

  it("a count adds that much", () => {
    expect(run("n = 10", "25<C-a>").lines).toEqual(["n = 35"]);
  });

  it("<C-x> subtracts and goes negative", () => {
    expect(run("n = 1", "3<C-x>").lines).toEqual(["n = -2"]);
  });

  it("a negative number counts up to zero and drops the sign", () => {
    expect(run("n = -1", "<C-a>").lines).toEqual(["n = 0"]);
  });

  it("the cursor ends on the last digit", () => {
    expect(run("n = 99", "<C-a>").cursor).toEqual({ line: 0, col: 6 });
  });

  it("a line without a number is left alone and the command fails", () => {
    const state = run("abc", "<C-a>");
    expect(state.lines).toEqual(["abc"]);
    expect(state.failed).toBe(true);
  });

  it("a number before the cursor is not found", () => {
    expect(run("5 x", "<C-a>", 2).lines).toEqual(["5 x"]);
  });

  it("is one undo step", () => {
    expect(run("n = 1", "<C-a><C-a>u").lines).toEqual(["n = 2"]);
  });

  it("dot repeats it with its count", () => {
    expect(run("1\n1", "4<C-a>j.").lines).toEqual(["5", "5"]);
  });

  it("hexadecimal keeps the 0x and the width", () => {
    expect(run("0x0f", "<C-a>").lines).toEqual(["0x10"]);
  });

  it("hexadecimal digits follow the case of the last letter", () => {
    expect(run("0xFE", "<C-a>").lines).toEqual(["0xFF"]);
    expect(run("0xfe", "<C-a>").lines).toEqual(["0xff"]);
  });

  it("binary keeps the 0b and the width", () => {
    expect(run("0b011", "<C-a>").lines).toEqual(["0b100"]);
  });
});
