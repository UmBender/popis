import { describe, expect, it } from "vitest";
import { pressEditKey } from "./edit";
import { parseKeys } from "./keys";
import { createState, type VimState } from "./state";

// AC-4: the command line and `:s`. The fidelity against Neovim is in cases/
// (visual-cases.test.ts); these tests cover the parts the oracle cannot show
// (the line being typed, `:w`, `:q`) and the edges of the ranges.

const TEXT = ["one two", "two three", "three four", "four one"];

function run(keys: string, lines: readonly string[] = TEXT, at = { line: 0, col: 0 }): VimState {
  let state = createState(lines, at);
  for (const key of parseKeys(keys)) state = pressEditKey(state, key);
  return state;
}

describe("command line", () => {
  it(": opens the command line in its own mode", () => {
    const state = run(":");
    expect(state.mode).toBe("cmdline");
    expect(state.cmdline).toBe("");
  });

  it("typed characters build the line", () => {
    expect(run(":s/a").cmdline).toBe("s/a");
  });

  it("<BS> removes a character and, on an empty line, leaves the command line", () => {
    expect(run(":ab<BS>").cmdline).toBe("a");
    const state = run(":a<BS><BS>");
    expect(state.mode).toBe("normal");
    expect(state.cmdline).toBeNull();
  });

  it("<Esc> cancels the command and keeps the text", () => {
    const state = run(":%s/one/x/<Esc>");
    expect(state.mode).toBe("normal");
    expect(state.cmdline).toBeNull();
    expect(state.lines).toEqual(TEXT);
  });

  it(": in visual mode starts with the range of the selection", () => {
    const state = run("Vj:");
    expect(state.mode).toBe("cmdline");
    expect(state.cmdline).toBe("'<,'>");
    expect(state.visual).toBeNull();
  });

  it("a key that is not a character is ignored inside the line", () => {
    expect(run(":a<Tab>").cmdline).toBe("a");
  });

  it(":noh, :w and :q are accepted and change nothing", () => {
    for (const command of ["noh", "w", "q"]) {
      const state = run(`:${command}<CR>`);
      expect(state.mode).toBe("normal");
      expect(state.lines).toEqual(TEXT);
      expect(state.cursor).toEqual({ line: 0, col: 0 });
    }
  });

  it("an unknown command is dropped without a change", () => {
    const state = run(":foo<CR>");
    expect(state.mode).toBe("normal");
    expect(state.lines).toEqual(TEXT);
  });

  it("an empty command does nothing", () => {
    expect(run(":<CR>").mode).toBe("normal");
  });
});

describe(":s ranges", () => {
  it("no range is the cursor line", () => {
    expect(run(":s/o/0/<CR>", TEXT, { line: 1, col: 0 }).lines[1]).toBe("tw0 three");
    expect(run(":s/o/0/<CR>", TEXT, { line: 1, col: 0 }).lines[0]).toBe("one two");
  });

  it("% is the whole buffer", () => {
    expect(run(":%s/one/1/<CR>").lines).toEqual(["1 two", "two three", "three four", "four 1"]);
  });

  it("numbers, . and $ with offsets", () => {
    expect(run(":2,3s/e/E/<CR>").lines).toEqual(["one two", "two thrEe", "thrEe four", "four one"]);
    expect(run(":.,+1s/o/0/<CR>").lines.slice(0, 3)).toEqual([
      "0ne two",
      "tw0 three",
      "three four",
    ]);
    expect(run(":-1,.s/o/0/<CR>", TEXT, { line: 2, col: 0 }).lines.slice(1)).toEqual([
      "tw0 three",
      "three f0ur",
      "four one",
    ]);
    expect(run(":$s/one/1/<CR>").lines[3]).toBe("four 1");
  });

  it("'<,'> is the last selection", () => {
    const state = run("Vj<Esc>G:'<lt>,'>s/o/0/<CR>");
    expect(state.lines).toEqual(["0ne two", "tw0 three", "three four", "four one"]);
  });

  it("a range past the buffer is an error (E16) and changes nothing", () => {
    expect(run(":3,99s/four/4/<CR>").lines).toEqual(TEXT);
    expect(run(":-1s/one/1/<CR>").lines).toEqual(TEXT);
  });

  it("'<,'> without an earlier selection changes nothing", () => {
    expect(run(":'<lt>,'>s/o/0/<CR>").lines).toEqual(TEXT);
  });
});

describe(":s pattern and replacement", () => {
  it("g replaces every match on the line, no flag only the first", () => {
    expect(run(":s/e/E/g<CR>", ["eee"]).lines).toEqual(["EEE"]);
    expect(run(":s/e/E/<CR>", ["eee"]).lines).toEqual(["Eee"]);
  });

  it("\\< and \\> match word edges", () => {
    expect(run(":s/\\<lt>a\\>/b/g<CR>", ["a ab ba a"]).lines).toEqual(["b ab ba b"]);
  });

  it(". matches any character and other characters are literal", () => {
    expect(run(":s/a.c/X/<CR>", ["abc a.c"]).lines).toEqual(["X a.c"]);
    expect(run(":s/(x)/y/<CR>", ["f(x)"]).lines).toEqual(["fy"]);
    expect(run(":s/a+/y/<CR>", ["aa a+"]).lines).toEqual(["aa y"]);
  });

  it("^ and $ anchor the pattern", () => {
    expect(run(":s/^/\\/\\/ /<CR>", ["a"]).lines).toEqual(["// a"]);
    expect(run(":s/$/;/<CR>", ["a"]).lines).toEqual(["a;"]);
  });

  it("& is the match, \\& a literal &, \\/ a slash and \\\\ a backslash", () => {
    expect(run(":s/b/[&]/<CR>", ["abc"]).lines).toEqual(["a[b]c"]);
    expect(run(":s/b/\\&/<CR>", ["abc"]).lines).toEqual(["a&c"]);
    expect(run(":s/b/\\//<CR>", ["abc"]).lines).toEqual(["a/c"]);
    expect(run(":s/b/\\\\n/<CR>", ["abc"]).lines).toEqual(["a\\nc"]);
  });

  it("an empty match does not loop and, as in Neovim, skips the end of a line", () => {
    expect(run(":s/x*/-/g<CR>", ["ab"]).lines).toEqual(["-a-b"]);
    expect(run(":s/x*/-/<CR>", [""]).lines).toEqual(["-"]);
  });

  it("the final delimiter and the flags are optional", () => {
    expect(run(":s/a/b<CR>", ["aa"]).lines).toEqual(["ba"]);
  });

  it("a pattern that is not found leaves the cursor and the text", () => {
    const state = run(":%s/zzz/y/<CR>", TEXT, { line: 2, col: 3 });
    expect(state.lines).toEqual(TEXT);
    expect(state.cursor).toEqual({ line: 2, col: 3 });
  });

  it("the cursor goes to the first non-blank of the last changed line", () => {
    const state = run(":%s/one/1/<CR>", ["  one", "two", "  one"]);
    expect(state.cursor).toEqual({ line: 2, col: 2 });
  });

  it("u undoes the whole substitution", () => {
    expect(run(":%s/o/0/g<CR>u").lines).toEqual(TEXT);
  });

  it("the substitution does not touch the register or the dot", () => {
    const state = run("x:%s/o/0/<CR>");
    expect(state.register).toEqual({ lines: ["o"], linewise: false });
    expect(state.lastChange?.keys).toEqual(["x"]);
  });

  it("an unknown flag or a missing pattern is dropped without a change", () => {
    expect(run(":s/o/0/q<CR>").lines).toEqual(TEXT);
    expect(run(":s<CR>").lines).toEqual(TEXT);
  });
});
