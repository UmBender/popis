import { describe, expect, it } from "vitest";
import { commandLevel, LEVEL_LABELS, LEVELS, levelHelp } from "./levels";

// AC-4: levels add up, and each command has a sentence in Portuguese.

const keysOf = (level: (typeof LEVELS)[number]) => levelHelp(level).map((h) => h.keys);

describe("levels", () => {
  it("there are seven levels, numbered from 1", () => {
    expect(LEVELS).toEqual([1, 2, 3, 4, 5, 6, 7]);
    for (const level of LEVELS) expect(LEVEL_LABELS[level].length).toBeGreaterThan(0);
  });

  it("level 1 has only h j k l", () => {
    expect(keysOf(1)).toEqual(["h", "j", "k", "l"]);
  });

  it("level 2 adds the word motions", () => {
    expect(keysOf(2)).toEqual([...keysOf(1), "w", "b", "e", "W", "B", "E", "ge"]);
  });

  it("level 3 adds the line motions", () => {
    expect(keysOf(3)).toEqual([...keysOf(2), "0", "^", "$"]);
  });

  it("level 4 adds the character finds", () => {
    expect(keysOf(4)).toEqual([...keysOf(3), "f{c}", "F{c}", "t{c}", "T{c}", ";", ","]);
  });

  it("level 5 adds counts", () => {
    expect(keysOf(5)).toEqual([...keysOf(4), "{n}"]);
  });

  it("level 6 adds the jumps", () => {
    expect(keysOf(6)).toEqual([...keysOf(5), "gg", "G", "{n}G", "{", "}", "%"]);
  });

  it("level 7 adds the searches", () => {
    expect(keysOf(7)).toEqual([...keysOf(6), "/", "?", "n", "N", "*", "#"]);
  });

  it("every command has a sentence and the level that adds it", () => {
    for (const level of LEVELS) {
      for (const help of levelHelp(level)) {
        expect(help.text.length, help.keys).toBeGreaterThan(10);
        expect(help.level).toBeLessThanOrEqual(level);
      }
    }
    expect(levelHelp(4).find((h) => h.keys === "t{c}")?.text).toContain("vírgula");
  });

  it("commandLevel gives the level of each command and null for unknown ones", () => {
    expect(commandLevel("h")).toBe(1);
    expect(commandLevel("ge")).toBe(2);
    expect(commandLevel("$")).toBe(3);
    expect(commandLevel(";")).toBe(4);
    expect(commandLevel("count")).toBe(5);
    expect(commandLevel("gg")).toBe(6);
    expect(commandLevel("#")).toBe(7);
    expect(commandLevel("x")).toBeNull();
  });
});
