import { describe, expect, it } from "vitest";
import { execute, searchMatches, type Command } from "./motions";
import { createState, type VimState } from "./state";

// AC-2: the movements as pure functions of the state. The fidelity cases in
// src/vim/cases/ cover the Neovim details; these cover the API.

const TEXT = ["int main() {", "    int a = f(1, 2);", "    return a;", "}"];

function state(cursor: [number, number] = [0, 0], lines: readonly string[] = TEXT): VimState {
  return createState(lines, { line: cursor[0], col: cursor[1] });
}

const simple = (name: Extract<Command, { count: number | null }>["name"], count: number | null) =>
  ({ name, count }) as Command;

const at = (s: VimState) => [s.cursor.line, s.cursor.col];

describe("execute", () => {
  it("execute moves the cursor and returns a new state", () => {
    const before = state();
    const after = execute(before, simple("j", null));
    expect(at(after)).toEqual([1, 0]);
    expect(at(before)).toEqual([0, 0]);
    expect(after.lines).toBe(before.lines);
  });

  it("execute treats a null count as 1", () => {
    expect(at(execute(state(), simple("l", null)))).toEqual(at(execute(state(), simple("l", 1))));
  });

  it("execute leaves the state alone when a movement fails", () => {
    const before = state([0, 0]);
    expect(at(execute(before, simple("h", null)))).toEqual([0, 0]);
    expect(at(execute(before, simple("k", 3)))).toEqual([0, 0]);
    expect(at(execute(state([3, 0]), simple("j", null)))).toEqual([3, 0]);
  });

  it("execute sets the wanted column to infinity with $ and to the column with 0", () => {
    expect(execute(state(), simple("$", null)).curswant).toBe(Infinity);
    expect(execute(state([0, 5]), simple("0", null)).curswant).toBe(0);
    expect(execute(state([1, 8]), simple("^", null)).curswant).toBe(4);
  });

  it("execute keeps the wanted column across j and k", () => {
    const wide = execute(state([1, 14]), simple("j", null));
    expect(at(wide)).toEqual([2, 12]);
    expect(wide.curswant).toBe(14);
    expect(at(execute(wide, simple("j", null)))).toEqual([3, 0]);
    expect(at(execute(execute(wide, simple("j", null)), simple("k", 2)))).toEqual([1, 14]);
  });

  it("execute finds a character with f F t T and remembers it", () => {
    const f = execute(state(), { name: "f", char: "m", count: null });
    expect(at(f)).toEqual([0, 4]);
    expect(f.lastFind).toEqual({ kind: "f", char: "m" });
    expect(at(execute(f, { name: "F", char: "i", count: null }))).toEqual([0, 0]);
    expect(at(execute(state(), { name: "t", char: "(", count: null }))).toEqual([0, 7]);
    expect(at(execute(state([0, 11]), { name: "T", char: "n", count: 2 }))).toEqual([0, 2]);
  });

  it("execute repeats a find with ; and reverses it with ,", () => {
    const f = execute(state([1, 0]), { name: "f", char: "1", count: null });
    expect(at(f)).toEqual([1, 14]);
    const again = execute(execute(f, { name: "F", char: " ", count: null }), simple(";", null));
    expect(at(again)).toEqual([1, 9]);
    expect(at(execute(again, simple(",", null)))).toEqual([1, 11]);
    expect(at(execute(state(), simple(";", null)))).toEqual([0, 0]);
  });

  it("execute goes to a line with gg and G, with and without a count", () => {
    expect(at(execute(state([0, 0]), simple("G", null)))).toEqual([3, 0]);
    expect(at(execute(state([3, 0]), simple("gg", null)))).toEqual([0, 0]);
    expect(at(execute(state([0, 0]), simple("G", 3)))).toEqual([2, 0]);
    expect(at(execute(state([0, 0]), simple("gg", 2)))).toEqual([1, 0]);
    expect(at(execute(state([0, 0]), simple("G", 99)))).toEqual([3, 0]);
  });

  it("execute goes to a percentage of the file with a count on %", () => {
    expect(at(execute(state(), simple("%", 50)))).toEqual([1, 0]);
    expect(at(execute(state(), simple("%", 101)))).toEqual([0, 0]);
  });

  it("execute jumps to the matching bracket with %", () => {
    expect(at(execute(state([0, 8]), simple("%", null)))).toEqual([0, 9]);
    expect(at(execute(state([0, 11]), simple("%", null)))).toEqual([3, 0]);
    expect(at(execute(state([1, 4]), simple("%", null)))).toEqual([1, 18]);
  });

  it("execute searches with / and ? using the pattern literally", () => {
    const s = state([0, 0], ["a.b axb", "a.b"]);
    expect(at(execute(s, { name: "/", pattern: "a.b", count: null }))).toEqual([1, 0]);
    expect(at(execute(s, { name: "?", pattern: "a.b", count: null }))).toEqual([1, 0]);
    expect(at(execute(s, { name: "/", pattern: "nope", count: null }))).toEqual([0, 0]);
  });

  it("execute repeats a search with n and N in the saved direction", () => {
    const first = execute(state([0, 0], ["ab ab ab"]), { name: "/", pattern: "ab", count: null });
    expect(at(first)).toEqual([0, 3]);
    expect(at(execute(first, simple("n", null)))).toEqual([0, 6]);
    expect(at(execute(first, simple("N", null)))).toEqual([0, 0]);
    expect(at(execute(state(), simple("n", null)))).toEqual([0, 0]);
  });

  it("execute searches the word under the cursor with * and #", () => {
    const s = state([1, 4], ["int a", "    int b", "int c"]);
    expect(at(execute(s, simple("*", null)))).toEqual([2, 0]);
    expect(at(execute(s, simple("#", null)))).toEqual([0, 0]);
    expect(at(execute(state([0, 0], ["", "x"]), simple("*", null)))).toEqual([0, 0]);
  });

  it("execute moves by words and WORDs", () => {
    const s = state([1, 4]);
    expect(at(execute(s, simple("w", null)))).toEqual([1, 8]);
    expect(at(execute(s, simple("e", null)))).toEqual([1, 6]);
    expect(at(execute(s, simple("b", null)))).toEqual([0, 11]);
    expect(at(execute(s, simple("ge", null)))).toEqual([0, 11]);
    expect(at(execute(s, simple("W", null)))).toEqual([1, 8]);
    expect(at(execute(s, simple("E", null)))).toEqual([1, 6]);
    expect(at(execute(s, simple("B", null)))).toEqual([0, 11]);
  });

  it("execute moves by paragraphs with { and }", () => {
    const text = ["a", "", "b", "c", "", "d"];
    expect(at(execute(state([0, 0], text), simple("}", null)))).toEqual([1, 0]);
    expect(at(execute(state([3, 0], text), simple("{", null)))).toEqual([1, 0]);
    expect(at(execute(state([5, 0], text), simple("}", null)))).toEqual([5, 0]);
  });
});

describe("searchMatches", () => {
  it("search with an empty pattern finds no match", () => {
    // Arrange
    const lines = ["ab ab"];

    // Act
    const found = searchMatches(lines, { pattern: "", startWord: false, endWord: false });

    // Assert
    expect(found).toEqual([]);
  });
});
