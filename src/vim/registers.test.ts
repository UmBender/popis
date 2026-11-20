import { describe, expect, it } from "vitest";
import { pressEditKey, registerView } from "./edit";
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

describe("registers: block, control characters and the rest", () => {
  it("a block yank has the block type and the width", () => {
    const state = run("abc\ndef", "<C-v>jly");
    expect(registersView(state)).toEqual({ "0": { reg: "ab\nde", regtype: "\x162" } });
    expect(listRegisters(state)[0]).toEqual({ name: '"', type: "b", text: "ab^Jde" });
    expect(registerView(state)).toEqual({ reg: "ab\nde", regtype: "\x162" });
  });

  it("a register with a delete character shows it as ^?", () => {
    const state: VimState = {
      ...createState(["a"], { line: 0, col: 0 }),
      registers: { a: { lines: ["x\x7fy"], linewise: false } },
    };
    expect(listRegisters(state)).toEqual([{ name: "a", type: "c", text: "x^?y" }]);
    expect(registersView(state)).toEqual({ a: { reg: "x\x7fy", regtype: "v" } });
  });

  it("a register of a block shows its type in the view", () => {
    const state: VimState = {
      ...createState(["a"], { line: 0, col: 0 }),
      registers: { b: { lines: ["a", "b"], linewise: false, block: 1 } },
    };
    expect(registersView(state)).toEqual({ b: { reg: "a\nb", regtype: "\x161" } });
  });

  it("a motion typed after the register prefix in visual mode writes nothing", () => {
    const state = run("abc", 'v"al');
    expect(state.mode).toBe("visual");
    expect(listRegisters(state)).toEqual([]);
  });

  it("an uppercase recording with nothing recorded changes nothing", () => {
    expect(listRegisters(run("abc", "qaxqqAq"))).toEqual([
      { name: '"', type: "c", text: "a" },
      { name: "-", type: "c", text: "a" },
      { name: "a", type: "c", text: "x" },
    ]);
  });

  it("an uppercase recording into an empty register starts it", () => {
    expect(listRegisters(run("abc", "qAxq")).map((l) => l.text)).toEqual(["a", "a", "x"]);
  });

  it("a text with a character outside the basic plane is pasted whole", () => {
    const state = run("😀", 'yl$a<C-r>"<Esc>');
    expect(state.lines).toEqual(["😀\ud83d"]);
  });
});

describe("registers: insert paste", () => {
  it("<C-r> waits for the register name", () => {
    const state = run("one", "yiwA <C-r>");
    expect(state.mode).toBe("insert");
    expect(state.lines).toEqual(["one "]);
  });

  it("<C-r> then Esc names no register: nothing is inserted and the insert goes on", () => {
    const state = run("one", "yiwA <C-r><Esc>");
    expect(state.mode).toBe("insert");
    expect(state.lines).toEqual(["one "]);
    expect(pressEditKey(state, "x").lines).toEqual(["one x"]);
  });
});
