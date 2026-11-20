import { describe, expect, it } from "vitest";
import { pressEditKey } from "./edit";
import { parseKeys } from "./keys";
import { getRegister, listRegisters, registersView } from "./registers";
import { createState, type VimState } from "./state";

// AC-1 and AC-7: how the registers are kept, shown and chosen. The values after
// each command are checked against Neovim by register-cases.test.ts.

function run(text: string, keys: string, at = { line: 0, col: 0 }): VimState {
  let state = createState(text.split("\n"), at);
  for (const key of parseKeys(keys)) state = pressEditKey(state, key);
  return state;
}

describe("registers: named and unnamed", () => {
  it("a new state has no register", () => {
    expect(registersView(createState(["a"], { line: 0, col: 0 }))).toEqual({});
  });

  it("a yank fills the unnamed register and register 0", () => {
    const state = run("one\ntwo", "yy");
    expect(getRegister(state, '"')?.lines).toEqual(["one"]);
    expect(getRegister(state, "0")?.lines).toEqual(["one"]);
  });

  it("an uppercase name reads the lowercase register", () => {
    const state = run("one\ntwo", '"ayyj"Ayy');
    expect(getRegister(state, "A")).toEqual(getRegister(state, "a"));
    expect(getRegister(state, "a")?.lines).toEqual(["one", "two"]);
  });

  it("the black hole register is always empty", () => {
    expect(getRegister(run("one", "yy"), "_")).toBeNull();
  });

  it("an unknown register name is empty", () => {
    expect(getRegister(run("one", "yy"), "!")).toBeNull();
  });

  it("the unnamed register can be named explicitly", () => {
    const state = run("ab", 'ylx""p');
    expect(state.lines).toEqual(["ba"]);
  });
});

describe("registers: the register prefix on the screen", () => {
  it("the quote and the name wait in the pending keys", () => {
    const quote = run("one", '"');
    expect(quote.pending).toEqual(['"']);
    expect(run("one", '"a').pending).toEqual(['"', "a"]);
  });

  it("a count after the register waits behind it", () => {
    expect(run("one", '"a3').pending).toEqual(['"', "a", "3"]);
  });

  it("Esc drops the register prefix", () => {
    expect(run("one", '"a<Esc>').pending).toEqual([]);
  });

  it("a name that is not a register drops the prefix and does nothing", () => {
    const state = run("one\ntwo", '"!yyp');
    expect(state.pending).toEqual([]);
    expect(state.lines).toEqual(["one", "one", "two"]);
  });

  it("a register prefix does not change what Y does", () => {
    const state = run("one\ntwo", '"aYj"ap');
    expect(state.lines).toEqual(["one", "two", "one"]);
  });
});

describe("registers: the register list", () => {
  it("shows the non-empty registers in the order of :reg", () => {
    const state = run("one\ntwo", 'yyj"add');
    expect(listRegisters(state).map((line) => line.name)).toEqual(['"', "0", "1", "a"]);
  });

  it("shows line breaks as ^J and marks the register type", () => {
    const state = run("one\ntwo", "yj");
    expect(listRegisters(state)[0]).toEqual({ name: '"', type: "l", text: "one^Jtwo^J" });
  });

  it("marks characters with c", () => {
    const state = run("one two", "yw");
    expect(listRegisters(state)[0]).toEqual({ name: '"', type: "c", text: "one " });
  });

  it("shows a recorded macro with control characters spelled out", () => {
    const state = run("one", "qaiX<Esc>q");
    expect(listRegisters(state)).toEqual([{ name: "a", type: "c", text: "iX^[" }]);
  });

  it("is empty when nothing was copied", () => {
    expect(listRegisters(createState(["one"], { line: 0, col: 0 }))).toEqual([]);
  });
});

describe("registers: insert paste", () => {
  it("<C-r> waits for the register name", () => {
    const state = run("one", "yiwA <C-r>");
    expect(state.mode).toBe("insert");
    expect(state.lines).toEqual(["one "]);
  });

  it("<C-r> then Esc inserts nothing and leaves insert mode", () => {
    const state = run("one", "yiwA <C-r><Esc>");
    expect(state.mode).toBe("normal");
    expect(state.lines).toEqual(["one "]);
  });
});
