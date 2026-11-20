import { describe, expect, it } from "vitest";
import { pressEditKey, registerView } from "./edit";
import { parseKeys } from "./keys";
import { createState, type VimState } from "./state";

// AC-1 to AC-4 by behaviour; `edit-cases.test.ts` holds the Neovim cases.

function run(text: string, from: readonly [number, number], keys: string): VimState {
  let state = createState(text.split("\n"), { line: from[0], col: from[1] });
  for (const key of parseKeys(keys)) state = pressEditKey(state, key);
  return state;
}

const text = (state: VimState) => state.lines.join("\n");
const at = (state: VimState) => [state.cursor.line, state.cursor.col];

describe("insert mode", () => {
  it("i enters insert mode and typed characters go before the cursor", () => {
    const state = run("foo", [0, 1], "iXY");
    expect(state.mode).toBe("insert");
    expect(text(state)).toBe("fXYoo");
    expect(at(state)).toEqual([0, 3]);
  });

  it("Esc goes back to normal mode and one column left", () => {
    const state = run("foo", [0, 1], "iXY<Esc>");
    expect(state.mode).toBe("normal");
    expect(at(state)).toEqual([0, 2]);
  });

  it("a, I, A, o and O place the cursor where Vim does", () => {
    expect(at(run("  foo bar", [0, 4], "a"))).toEqual([0, 5]);
    expect(at(run("  foo bar", [0, 4], "I"))).toEqual([0, 2]);
    expect(at(run("  foo bar", [0, 4], "A"))).toEqual([0, 9]);
    expect(at(run("a\nb", [0, 0], "o"))).toEqual([1, 0]);
    expect(at(run("a\nb", [1, 0], "O"))).toEqual([1, 0]);
    expect(text(run("a\nb", [1, 0], "O"))).toBe("a\n\nb");
  });

  it("Enter splits the line and Backspace joins it back", () => {
    expect(text(run("foobar", [0, 3], "i<CR>"))).toBe("foo\nbar");
    expect(text(run("foobar", [0, 3], "i<CR><BS>"))).toBe("foobar");
  });

  it("keys that are not text do nothing in insert mode", () => {
    expect(text(run("foo", [0, 0], "i<C-w>"))).toBe("foo");
  });

  it("a count repeats the typed text when Esc ends the session", () => {
    expect(text(run("x", [0, 0], "3ia<Esc>"))).toBe("aaax");
  });

  it("unknown keys in normal mode are ignored and clear the pending keys", () => {
    const state = run("foo bar", [0, 3], "d<C-w>");
    expect(state.pending).toEqual([]);
    expect(text(state)).toBe("foo bar");
  });
});

describe("operators", () => {
  it("the pending keys show the command being typed", () => {
    expect(run("foo", [0, 0], "d2").pending).toEqual(["d", "2"]);
    expect(run("foo", [0, 0], "2d").pending).toEqual(["2", "d"]);
    expect(run("foo", [0, 0], "di").pending).toEqual(["d", "i"]);
  });

  it("dw deletes up to the next word and fills the register with characters", () => {
    const state = run("foo bar", [0, 0], "dw");
    expect(text(state)).toBe("bar");
    expect(registerView(state)).toEqual({ reg: "foo ", regtype: "v" });
  });

  it("2dw and d2w do the same", () => {
    expect(text(run("a b c d", [0, 0], "2dw"))).toBe(text(run("a b c d", [0, 0], "d2w")));
    expect(text(run("a b c d", [0, 0], "d2w"))).toBe("c d");
  });

  it("dw on the last word of a line does not join the next line", () => {
    expect(text(run("foo bar\nbaz", [0, 4], "dw"))).toBe("foo \nbaz");
  });

  it("cw acts like ce on a word", () => {
    expect(text(run("foo bar", [0, 0], "cwX<Esc>"))).toBe("X bar");
  });

  it("dd deletes lines, fills the register with lines and goes to the first non-blank", () => {
    const state = run("a\n  b\nc", [0, 0], "dd");
    expect(text(state)).toBe("  b\nc");
    expect(at(state)).toEqual([0, 2]);
    expect(registerView(state)).toEqual({ reg: "a\n", regtype: "V" });
  });

  it("a linear movement makes the operator work on whole lines", () => {
    expect(text(run("a\nb\nc", [0, 0], "dj"))).toBe("c");
    expect(text(run("a\nb\nc", [2, 0], "dgg"))).toBe("");
  });

  it("a failed movement cancels the operator", () => {
    const state = run("a\nb", [1, 0], "dj");
    expect(text(state)).toBe("a\nb");
    expect(state.pending).toEqual([]);
    expect(registerView(state).regtype).toBe("");
  });

  it("y leaves the text alone and p pastes characters after the cursor", () => {
    const state = run("foo bar", [0, 0], "ywwp");
    expect(text(state)).toBe("foo bfoo ar");
  });

  it("yy then p pastes the line below", () => {
    expect(text(run("a\nb", [0, 0], "yyp"))).toBe("a\na\nb");
  });

  it("x, X, r, s, S and ~ edit around the cursor", () => {
    expect(text(run("abc", [0, 1], "x"))).toBe("ac");
    expect(text(run("abc", [0, 1], "X"))).toBe("bc");
    expect(text(run("abc", [0, 1], "rz"))).toBe("azc");
    expect(text(run("abc", [0, 1], "sZ<Esc>"))).toBe("aZc");
    expect(text(run("abc", [0, 1], "SZ<Esc>"))).toBe("Z");
    expect(text(run("abc", [0, 1], "~"))).toBe("aBc");
  });

  it("D and C work to the end of the line, Y yanks it", () => {
    expect(text(run("foo bar", [0, 3], "D"))).toBe("foo");
    expect(text(run("foo bar", [0, 3], "CX<Esc>"))).toBe("fooX");
    expect(registerView(run("foo bar", [0, 3], "Y"))).toEqual({ reg: " bar", regtype: "v" });
  });

  it("a text object works with an operator and a count", () => {
    expect(text(run("f(a, (b))", [0, 6], "di("))).toBe("f(a, ())");
    expect(text(run("f(a, (b))", [0, 6], "d2i("))).toBe("f()");
  });

  it("the register holds the last yank or delete", () => {
    const state = run("foo bar", [0, 0], "ywwdw");
    expect(registerView(state)).toEqual({ reg: "bar", regtype: "v" });
  });
});

describe("undo, redo and dot", () => {
  it("u undoes an insert session in one step", () => {
    expect(text(run("foo", [0, 0], "ia<CR>b<Esc>u"))).toBe("foo");
  });

  it("u undoes a change together with the text typed after it", () => {
    expect(text(run("foo bar", [0, 0], "ciwXYZ<Esc>u"))).toBe("foo bar");
  });

  it("<C-r> redoes what u undid, and a new change drops the redo", () => {
    expect(text(run("foo bar", [0, 0], "dwu<C-r>"))).toBe("bar");
    expect(text(run("foo bar", [0, 0], "dwuxu<C-r>"))).toBe("oo bar");
  });

  it("u with nothing to undo changes nothing", () => {
    expect(text(run("foo", [0, 0], "u"))).toBe("foo");
  });

  it(". repeats the last change, inserted text included", () => {
    expect(text(run("a b c", [0, 0], "ciwfoo<Esc>w."))).toBe("foo foo c");
  });

  it(". with a count replaces the original count", () => {
    expect(text(run("abcdefgh", [0, 0], "2x3."))).toBe("fgh");
  });

  it(". does not repeat a yank or a movement", () => {
    expect(text(run("abc", [0, 0], "xywl."))).toBe("b");
  });

  it(". is one undo step", () => {
    expect(text(run("a b c", [0, 0], "dw.u"))).toBe("b c");
  });
});
