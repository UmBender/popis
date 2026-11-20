import { describe, expect, it } from "vitest";
import { pressKey } from "./engine";
import { parseKeys } from "./keys";
import type { Level } from "./levels";
import { createState, type VimState } from "./state";

const TEXT = "foo(bar, baz)\nqux quux\n\nend";

function start(cursor: [number, number] = [0, 0]): VimState {
  return createState(TEXT.split("\n"), { line: cursor[0], col: cursor[1] });
}

/** Presses the keys and returns the last result. */
function type(keys: string, level: Level, from: VimState = start()) {
  let state = from;
  let blocked: string | null = null;
  for (const key of parseKeys(keys)) ({ state, blocked } = pressKey(state, key, level));
  return { state, blocked };
}

const at = (s: VimState) => [s.cursor.line, s.cursor.col];

describe("createState", () => {
  it("createState puts the cursor on the given position", () => {
    const s = start([1, 4]);
    expect(at(s)).toEqual([1, 4]);
    expect(s.curswant).toBe(4);
    expect(s.pending).toEqual([]);
    expect(s.lastFind).toBeNull();
    expect(s.lastSearch).toBeNull();
  });

  it("createState clamps the cursor into the buffer", () => {
    expect(at(start([99, 99]))).toEqual([3, 2]);
    expect(at(start([1, 99]))).toEqual([1, 8]);
    expect(at(start([2, 5]))).toEqual([2, 0]);
    expect(at(start([-1, -3]))).toEqual([0, 0]);
  });

  it("createState keeps an empty buffer as one empty line", () => {
    const s = createState([], { line: 0, col: 0 });
    expect(s.lines).toEqual([""]);
  });
});

describe("pressKey", () => {
  it("pressKey keeps the wanted column over short lines with j and k", () => {
    const s = type("$jj", 7, start()).state;
    expect(at(s)).toEqual([2, 0]);
    expect(s.curswant).toBe(Infinity);
    expect(at(type("jjk", 7, start([0, 5])).state)).toEqual([1, 5]);
    expect(type("l", 7, start([1, 3])).state.curswant).toBe(4);
  });

  it("pressKey does not change the state it is given", () => {
    const before = start([0, 2]);
    const snapshot = JSON.stringify(before);
    pressKey(before, "w", 7);
    pressKey(before, "f", 7);
    expect(JSON.stringify(before)).toBe(snapshot);
  });

  it("pressKey keeps the typed prefix of a command as pending", () => {
    let s = pressKey(start(), "2", 7).state;
    expect(s.pending).toEqual(["2"]);
    s = pressKey(s, "f", 7).state;
    expect(s.pending).toEqual(["2", "f"]);
    s = pressKey(s, "(", 7).state;
    expect(s.pending).toEqual([]);
    expect(at(s)).toEqual([0, 3]);
  });

  it("pressKey reads a count of several digits", () => {
    const s = createState(["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l"], {
      line: 0,
      col: 0,
    });
    const typed = type("10j", 7, s);
    expect(typed.state.cursor.line).toBe(10);
    expect(type("10", 7, s).state.pending).toEqual(["1", "0"]);
  });

  it("pressKey cancels the pending command on Escape", () => {
    const { state, blocked } = type("2f<Esc>", 7);
    expect(state.pending).toEqual([]);
    expect(blocked).toBeNull();
    expect(at(state)).toEqual([0, 0]);
    expect(type("g<Esc>", 7).state.pending).toEqual([]);
    expect(type("/ab<Esc>", 7).state.pending).toEqual([]);
  });

  it("pressKey cancels a find when the next key is not a character", () => {
    expect(type("f<CR>", 7).state.pending).toEqual([]);
    expect(type("t<BS>", 7).state.pending).toEqual([]);
    expect(type("fx", 7).state.lastFind).toEqual({ kind: "f", char: "x" });
  });

  it("pressKey ignores keys that are not movements", () => {
    const { state, blocked } = type("x", 7);
    expect(at(state)).toEqual([0, 0]);
    expect(state.pending).toEqual([]);
    expect(blocked).toBeNull();
    expect(type("<C-v>", 7).blocked).toBeNull();
    expect(type("gx", 7).blocked).toBeNull();
    expect(type("gx", 7).state.pending).toEqual([]);
    expect(type("2x", 7).state.pending).toEqual([]);
  });

  it("pressKey applies a count to the movement that follows", () => {
    expect(at(type("3w", 7).state)).toEqual([0, 7]);
    expect(at(type("2gg", 7).state)).toEqual([1, 0]);
    expect(at(type("3G", 7).state)).toEqual([2, 0]);
  });

  it("pressKey treats 0 as a movement without a count and as a digit after one", () => {
    expect(at(type("w0", 7).state)).toEqual([0, 0]);
    expect(at(type("1", 7).state)).toEqual([0, 0]);
    expect(type("1", 7).state.pending).toEqual(["1"]);
  });
});

describe("pressKey searching", () => {
  it("pressKey collects the pattern of a search as pending text", () => {
    let s = pressKey(start(), "/", 7).state;
    expect(s.pending).toEqual(["/"]);
    s = pressKey(s, "b", 7).state;
    s = pressKey(s, "a", 7).state;
    expect(s.pending).toEqual(["/", "b", "a"]);
    s = pressKey(s, "<CR>", 7).state;
    expect(s.pending).toEqual([]);
    expect(at(s)).toEqual([0, 4]);
    expect(s.lastSearch).toEqual({
      spec: { pattern: "ba", startWord: false, endWord: false },
      dir: 1,
    });
  });

  it("pressKey deletes the last pattern character on Backspace", () => {
    const s = type("/bax<BS>", 7).state;
    expect(s.pending).toEqual(["/", "b", "a"]);
    expect(at(type("/bax<BS><CR>", 7).state)).toEqual([0, 4]);
  });

  it("pressKey leaves the search prompt when Backspace empties it", () => {
    expect(type("/<BS>", 7).state.pending).toEqual([]);
    expect(type("/a<BS><BS>", 7).state.pending).toEqual([]);
  });

  it("pressKey ignores control keys typed in a search prompt", () => {
    expect(type("/a<C-v>", 7).state.pending).toEqual(["/", "a"]);
  });

  it("pressKey searches backward with ? and counts a leading number", () => {
    expect(at(type("?foo<CR>", 7, start([1, 0])).state)).toEqual([0, 0]);
    expect(type("?a<CR>", 7).state.lastSearch?.dir).toBe(-1);
  });

  it("pressKey reuses the last pattern for an empty search", () => {
    expect(at(type("/a<CR>/<CR>", 7).state)).toEqual([0, 10]);
    expect(at(type("/<CR>", 7).state)).toEqual([0, 0]);
  });

  it("pressKey makes * and # remember the whole word", () => {
    const s = type("*", 7, start([1, 0])).state;
    expect(s.lastSearch).toEqual({
      spec: { pattern: "qux", startWord: true, endWord: true },
      dir: 1,
    });
    expect(type("#", 7, start([1, 0])).state.lastSearch?.dir).toBe(-1);
    expect(type("*", 7, start([0, 3])).state.lastSearch?.spec.pattern).toBe("bar");
    const punctuation = createState(["++ --"], { line: 0, col: 0 });
    expect(type("*", 7, punctuation).state.lastSearch?.spec).toEqual({
      pattern: "++",
      startWord: false,
      endWord: false,
    });
  });
});

describe("pressKey blocking", () => {
  it("pressKey blocks a movement the level does not have", () => {
    const { state, blocked } = type("w", 1);
    expect(blocked).toBe("w");
    expect(at(state)).toEqual([0, 0]);
    expect(state.pending).toEqual([]);
  });

  it("pressKey allows the movements of the level and all before it", () => {
    expect(type("l", 1).blocked).toBeNull();
    expect(at(type("w", 2).state)).toEqual([0, 3]);
    expect(at(type("$", 3).state)).toEqual([0, 12]);
    expect(at(type("fb", 4).state)).toEqual([0, 4]);
    expect(at(type("l", 7).state)).toEqual([0, 1]);
  });

  it("pressKey blocks 0 and ^ before level 3", () => {
    expect(type("0", 2).blocked).toBe("0");
    expect(type("^", 2).blocked).toBe("^");
    expect(type("$", 2).blocked).toBe("$");
    expect(type("0", 3).blocked).toBeNull();
  });

  it("pressKey blocks f t ; and , before level 4 and names the key", () => {
    expect(type("f", 3).blocked).toBe("f");
    expect(type("T", 3).blocked).toBe("T");
    expect(type(";", 3).blocked).toBe(";");
    expect(type(",", 3).blocked).toBe(",");
  });

  it("pressKey blocks counts before level 5", () => {
    expect(type("3", 4).blocked).toBe("3");
    expect(at(type("3w", 4).state)).toEqual([0, 0]);
    expect(at(type("3w", 5).state)).toEqual([0, 7]);
  });

  it("pressKey blocks gg G { } % before level 6", () => {
    for (const key of ["G", "{", "}", "%"]) expect(type(key, 5).blocked).toBe(key);
    expect(type("gg", 5).blocked).toBe("gg");
    expect(type("gg", 5).state.pending).toEqual([]);
    expect(type("gg", 6).blocked).toBeNull();
  });

  it("pressKey blocks searches before level 7", () => {
    for (const key of ["/", "?", "n", "N", "*", "#"]) expect(type(key, 6).blocked).toBe(key);
    expect(type("/", 7).blocked).toBeNull();
  });

  it("pressKey allows ge from level 2 but g alone is blocked on level 1", () => {
    expect(type("g", 1).blocked).toBe("g");
    expect(type("ge", 2).blocked).toBeNull();
    expect(type("g", 2).state.pending).toEqual(["g"]);
  });

  it("pressKey keeps a blocked count from moving the cursor", () => {
    const { state, blocked } = type("2j", 4);
    expect(blocked).toBe("2");
    expect(at(state)).toEqual([1, 0]);
  });

  it("pressKey clears the blocked report on the next allowed key", () => {
    const first = pressKey(start(), "w", 1);
    expect(first.blocked).toBe("w");
    expect(pressKey(first.state, "l", 1).blocked).toBeNull();
  });
});
