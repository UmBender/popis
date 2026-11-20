import { describe, expect, it } from "vitest";
import { pressEditKey } from "./edit";
import { parseKeys } from "./keys";
import { createState, type VimState } from "./state";
import { selectionRange } from "./visual";

// AC-1, AC-2 and AC-3: the visual mode, the block insert, and the shift and
// join commands. The fidelity against Neovim is in cases/ (visual-cases.test.ts);
// these tests pin the state the screen reads.

const TEXT = ["foo bar(baz, qux)", "  second line here", "", "last one"];

function run(keys: string, lines: readonly string[] = TEXT, at = { line: 0, col: 4 }): VimState {
  let state = createState(lines, at);
  for (const key of parseKeys(keys)) state = pressEditKey(state, key);
  return state;
}

describe("visual mode", () => {
  it("v enters character mode with the anchor where the cursor was", () => {
    const state = run("v");
    expect(state.mode).toBe("visual");
    expect(state.visual).toEqual({ kind: "char", anchor: { line: 0, col: 4 } });
  });

  it("V and <C-v> enter line and block mode", () => {
    expect(run("V").visual?.kind).toBe("line");
    expect(run("<C-v>").visual?.kind).toBe("block");
  });

  it("a movement moves the cursor and keeps the anchor", () => {
    const state = run("vlw");
    expect(state.visual?.anchor).toEqual({ line: 0, col: 4 });
    expect(state.cursor).toEqual({ line: 0, col: 7 });
  });

  it("the mode key of the same kind leaves visual mode", () => {
    const state = run("vlv");
    expect(state.mode).toBe("normal");
    expect(state.visual).toBeNull();
  });

  it("another mode key switches the kind and keeps the anchor", () => {
    const state = run("vlV");
    expect(state.visual).toEqual({ kind: "line", anchor: { line: 0, col: 4 } });
  });

  it("Esc leaves visual mode and remembers the selection for gv", () => {
    const state = run("vll<Esc>");
    expect(state.mode).toBe("normal");
    expect(state.lastVisual).toEqual({
      kind: "char",
      anchor: { line: 0, col: 4 },
      cursor: { line: 0, col: 6 },
    });
  });

  it("o swaps the ends of the selection", () => {
    const state = run("vllo");
    expect(state.cursor).toEqual({ line: 0, col: 4 });
    expect(state.visual?.anchor).toEqual({ line: 0, col: 6 });
  });

  it("$ puts the cursor past the last character in character mode", () => {
    const state = run("v$");
    expect(state.cursor).toEqual({ line: 0, col: 17 });
  });

  it("a text object selects its range", () => {
    const state = run("vi(", TEXT, { line: 0, col: 9 });
    expect(state.visual?.anchor).toEqual({ line: 0, col: 8 });
    expect(state.cursor).toEqual({ line: 0, col: 15 });
  });

  it("the pending keys show a count and an unfinished command", () => {
    expect(run("v2").pending).toEqual(["2"]);
    expect(run("vr").pending).toEqual(["r"]);
    expect(run("vi").pending).toEqual(["i"]);
  });

  it("an unknown key is dropped and the selection stays", () => {
    const state = run("vZ");
    expect(state.mode).toBe("visual");
    expect(state.pending).toEqual([]);
  });

  it("an operator ends visual mode and fills the register", () => {
    const state = run("vey");
    expect(state.mode).toBe("normal");
    expect(state.visual).toBeNull();
    expect(state.register).toEqual({ lines: ["bar"], linewise: false });
  });

  it("a block yank fills a block register with its width", () => {
    const state = run("<C-v>jly");
    expect(state.register).toEqual({ lines: ["ba", "co"], linewise: false, block: 2 });
  });

  it("the dot does not repeat a visual command and keeps the last change", () => {
    const state = run("xvld.");
    expect(state.lines[0]).toBe("foo baz, qux)");
    expect(state.lastChange?.keys).toEqual(["x"]);
  });

  it("gv in normal mode selects the last selection again", () => {
    const state = run("vll<Esc>$gv");
    expect(state.mode).toBe("visual");
    expect(state.visual?.anchor).toEqual({ line: 0, col: 4 });
    expect(state.cursor).toEqual({ line: 0, col: 6 });
  });

  it("gv with no earlier selection does nothing", () => {
    const state = run("gv");
    expect(state.mode).toBe("normal");
    expect(state.pending).toEqual([]);
  });

  it("u undoes a visual delete in one step", () => {
    const state = run("vlldu");
    expect(state.lines).toEqual(TEXT);
  });
});

describe("selection ranges for the screen", () => {
  it("character mode selects from the first end to the last, both included", () => {
    const state = run("vjl");
    expect(selectionRange(state, 0)).toEqual({ from: 4, to: 17 });
    expect(selectionRange(state, 1)).toEqual({ from: 0, to: 6 });
    expect(selectionRange(state, 2)).toBeNull();
  });

  it("character mode with $ includes the line break", () => {
    expect(selectionRange(run("v$"), 0)).toEqual({ from: 4, to: 18 });
  });

  it("line mode selects whole lines", () => {
    const state = run("Vj");
    expect(selectionRange(state, 0)).toEqual({ from: 0, to: 18 });
    expect(selectionRange(state, 1)).toEqual({ from: 0, to: 19 });
    expect(selectionRange(state, 2)).toBeNull();
  });

  it("block mode selects the same columns on every line, clipped by short lines", () => {
    const state = run("<C-v>jjll", TEXT, { line: 0, col: 4 });
    // The empty last line moves the cursor to column 0, so the block is columns 0 to 4.
    expect(selectionRange(state, 0)).toEqual({ from: 0, to: 5 });
    expect(selectionRange(state, 1)).toEqual({ from: 0, to: 5 });
    expect(selectionRange(state, 2)).toBeNull();
  });

  it("block mode with $ runs to the end of each line", () => {
    const state = run("<C-v>j$", TEXT, { line: 0, col: 4 });
    expect(selectionRange(state, 0)?.to).toBe(18);
    expect(selectionRange(state, 1)?.to).toBe(19);
  });

  it("there is no selection outside visual mode", () => {
    expect(selectionRange(run("vl<Esc>"), 0)).toBeNull();
  });
});

describe("block insert", () => {
  const CODE = ["cerr << a;", "cerr << b;", "cerr << c;", "x = 1;"];

  it("I types in insert mode on the first line until Esc", () => {
    const state = run("<C-v>jjI//", CODE, { line: 0, col: 0 });
    expect(state.mode).toBe("insert");
    expect(state.lines).toEqual(["//cerr << a;", "cerr << b;", "cerr << c;", "x = 1;"]);
  });

  it("Esc repeats the text on every line of the block", () => {
    const state = run("<C-v>jjI// <Esc>", CODE, { line: 0, col: 0 });
    expect(state.lines).toEqual(["// cerr << a;", "// cerr << b;", "// cerr << c;", "x = 1;"]);
    expect(state.mode).toBe("normal");
    expect(state.cursor).toEqual({ line: 0, col: 0 });
  });

  it("I leaves lines shorter than the block alone and A pads them", () => {
    const lines = ["abcdef", "ab", "abcdef"];
    expect(run("<C-v>jjllIX<Esc>", lines, { line: 0, col: 2 }).lines).toEqual([
      "abXcdef",
      "ab",
      "abXcdef",
    ]);
    expect(run("<C-v>jjllAX<Esc>", lines, { line: 0, col: 2 }).lines).toEqual([
      "abcdeXf",
      "ab   X",
      "abcdeXf",
    ]);
  });

  it("$A appends at the end of every line", () => {
    const state = run("<C-v>jjj$A;<Esc>", ["a", "bcd", "ef", "ghij"], { line: 0, col: 0 });
    expect(state.lines).toEqual(["a;", "bcd;", "ef;", "ghij;"]);
  });

  it("a line break in the text changes only the first line", () => {
    const state = run("<C-v>jIa<CR>b<Esc>", ["xx", "yy"], { line: 0, col: 0 });
    expect(state.lines).toEqual(["a", "bxx", "yy"]);
  });

  it("the whole block insert is one undo step", () => {
    const state = run("<C-v>jjI// <Esc>u", CODE, { line: 0, col: 0 });
    expect(state.lines).toEqual(CODE);
  });
});

describe("shift and join", () => {
  const CODE = ["a", "  b", "", "    c"];

  it(">> indents by 4 spaces and leaves empty lines alone", () => {
    expect(run("3>>", CODE, { line: 0, col: 0 }).lines).toEqual(["    a", "      b", "", "    c"]);
  });

  it("<< removes up to 4 spaces", () => {
    expect(run("3<lt><lt>", CODE, { line: 0, col: 0 }).lines).toEqual(["a", "b", "", "    c"]);
  });

  it("> and < take a motion or a text object", () => {
    const braces = ["if (x) {", "y();", "}"];
    expect(run(">i{", braces, { line: 1, col: 0 }).lines).toEqual(["if (x) {", "    y();", "}"]);
    expect(run(">j", braces, { line: 0, col: 0 }).lines).toEqual(["    if (x) {", "    y();", "}"]);
  });

  it("the dot repeats a shift", () => {
    expect(run(">>j.", ["a", "b"], { line: 0, col: 0 }).lines).toEqual(["    a", "    b"]);
  });

  it("J joins with one space and drops the indent of the next line", () => {
    expect(run("J", ["a", "   b"], { line: 0, col: 0 }).lines).toEqual(["a b"]);
  });

  it("J adds no space after a trailing blank or before a closing parenthesis", () => {
    expect(run("J", ["a ", "b"], { line: 0, col: 0 }).lines).toEqual(["a b"]);
    expect(run("J", ["f(", ")"], { line: 0, col: 0 }).lines).toEqual(["f()"]);
  });

  it("J on the last line changes nothing and the count is capped", () => {
    expect(run("J", ["a", "b"], { line: 1, col: 0 }).lines).toEqual(["a", "b"]);
    expect(run("9J", ["a", "b", "c"], { line: 1, col: 0 }).lines).toEqual(["a", "b c"]);
  });

  it("the dot repeats J", () => {
    expect(run("J.", ["a", "b", "c"], { line: 0, col: 0 }).lines).toEqual(["a b c"]);
  });

  it("J in visual mode joins the selected lines, at least two", () => {
    expect(run("VjjJ", ["a", "b", "c", "d"], { line: 0, col: 0 }).lines).toEqual(["a b c", "d"]);
    expect(run("VJ", ["a", "b", "c"], { line: 0, col: 0 }).lines).toEqual(["a b", "c"]);
  });

  it("> in block mode is ignored", () => {
    const state = run("<C-v>j>", ["a", "b"], { line: 0, col: 0 });
    expect(state.lines).toEqual(["a", "b"]);
    expect(state.mode).toBe("visual");
  });
});
