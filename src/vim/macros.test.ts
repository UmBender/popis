import { describe, expect, it } from "vitest";
import { pressEditKey } from "./edit";
import { parseKeys } from "./keys";
import { getRegister, macroKeys, macroText } from "./registers";
import { createState, type VimState } from "./state";

// AC-2: recording, running and stopping macros. What the register holds after
// each macro is checked against Neovim by register-cases.test.ts.

function run(text: string, keys: string, at = { line: 0, col: 0 }): VimState {
  let state = createState(text.split("\n"), at);
  for (const key of parseKeys(keys)) state = pressEditKey(state, key);
  return state;
}

describe("macros: recording", () => {
  it("q and a name start the recording", () => {
    const state = run("one", "qa");
    expect(state.recording).toEqual({ name: "a", keys: [] });
  });

  it("the keys typed are kept until the next q", () => {
    const state = run("one", "qaxl");
    expect(state.recording?.keys).toEqual(["x", "l"]);
  });

  it("q ends the recording and the keys go to the register", () => {
    const state = run("one", "qaxq");
    expect(state.recording).toBeNull();
    expect(getRegister(state, "a")?.lines).toEqual(["x"]);
  });

  it("a q typed in insert mode is text, not the end of the recording", () => {
    const state = run("one", "qaiq<Esc>q");
    expect(state.lines).toEqual(["qone"]);
    expect(getRegister(state, "a")?.lines).toEqual(["iq\x1b"]);
  });

  it("keys run by @ inside a recording are not recorded", () => {
    const state = run("one two", "qaxqqb@aq");
    expect(getRegister(state, "b")?.lines).toEqual(["@a"]);
  });

  it("a name that is not a letter does not start a recording", () => {
    expect(run("one", "q!").recording).toBeNull();
  });

  it("Esc cancels a q that waits for its name", () => {
    const state = run("one", "q<Esc>");
    expect(state.pending).toEqual([]);
    expect(state.recording).toBeNull();
  });

  it("the recorded text turns back into the keys", () => {
    const keys = ["i", "x", "<Esc>", "<CR>", "<BS>", "<C-a>", "<Tab>"];
    expect(macroKeys(macroText(keys))).toEqual(keys);
  });

  it("an Esc is the control character 0x1b in the text", () => {
    expect(macroText(["<Esc>"])).toBe("\x1b");
  });
});

describe("macros: running", () => {
  it("@a runs the register as keys", () => {
    expect(run("abc", "qaxq@a").lines).toEqual(["c"]);
  });

  it("a count runs the macro that many times", () => {
    expect(run("abcdef", "qaxq3@a").lines).toEqual(["ef"]);
  });

  it("@@ runs the last macro again and a count works there too", () => {
    expect(run("abcdef", "qaxq@a@@").lines).toEqual(["def"]);
    expect(run("abcdef", "qaxq@a2@@").lines).toEqual(["ef"]);
  });

  it("@@ remembers the macro, not the keys", () => {
    expect(run("abc", "qaxq@a").lastMacro).toBe("a");
  });

  it("a macro stops at the first failing motion", () => {
    const state = run("1\n2\n3", "qaA;<Esc>jq9@a");
    expect(state.lines).toEqual(["1;", "2;", "3;"]);
  });

  it("a macro stops when r has too few characters", () => {
    const state = run("ab\ncd", "qaA!<Esc>5rxjq3@a");
    expect(state.lines).toEqual(["ab!", "cd!"]);
  });

  it("each change of a macro is its own undo step", () => {
    const state = run("1\n2\n3", "qaA;<Esc>jq2@au");
    expect(state.lines).toEqual(["1;", "2;", "3"]);
  });

  it("a failed motion marks the state as failed, and the next key clears it", () => {
    const failed = run("ab", "h");
    expect(failed.failed).toBe(true);
    expect(pressEditKey(failed, "l").failed).toBe(false);
  });

  it("running a macro that is empty fails", () => {
    expect(run("ab", "@a").failed).toBe(true);
  });

  it("a macro can run another macro", () => {
    const state = run("abcdef", "qaxqqb@a@aq@b");
    expect(state.lines).toEqual(["f"]);
  });

  it("a macro of a register copied as text runs it", () => {
    const state = run("x\nabc", '"ayyj@a');
    expect(state.lines[0]).toBe("x");
  });

  it("the unnamed register is not the macro", () => {
    const state = run("abc", "yyqaxq");
    expect(getRegister(state, "0")?.lines).toEqual(["abc"]);
  });
});
