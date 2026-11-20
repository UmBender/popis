import { describe, expect, it } from "vitest";
import { formatKeys, keyFromEvent, parseKeys } from "./keys";

describe("parseKeys", () => {
  it("parseKeys splits plain characters into one key each", () => {
    expect(parseKeys("3fx")).toEqual(["3", "f", "x"]);
  });

  it("parseKeys reads named keys in angle brackets", () => {
    expect(parseKeys("3fx<CR>")).toEqual(["3", "f", "x", "<CR>"]);
    expect(parseKeys("<Esc>a<BS><Tab>")).toEqual(["<Esc>", "a", "<BS>", "<Tab>"]);
  });

  it("parseKeys reads control keys", () => {
    expect(parseKeys("<C-v><C-a>")).toEqual(["<C-v>", "<C-a>"]);
  });

  it("parseKeys reads <Space> and a raw space as the same key", () => {
    expect(parseKeys("f<Space>")).toEqual(["f", " "]);
    expect(parseKeys("f ")).toEqual(["f", " "]);
  });

  it("parseKeys reads <lt> as a literal less-than sign", () => {
    expect(parseKeys("<lt>")).toEqual(["<"]);
  });

  it("parseKeys returns an empty list for an empty string", () => {
    expect(parseKeys("")).toEqual([]);
  });

  it("parseKeys rejects an unknown key name", () => {
    expect(() => parseKeys("<Foo>")).toThrow(/unknown key/);
  });

  it("parseKeys rejects a bare less-than sign", () => {
    expect(() => parseKeys("a<b")).toThrow(/unknown key/);
  });
});

describe("formatKeys", () => {
  it("formatKeys joins plain keys", () => {
    expect(formatKeys(["f", "("])).toBe("f(");
  });

  it("formatKeys writes special keys with their names", () => {
    expect(formatKeys(["/", "a", "b", "<CR>"])).toBe("/ab<CR>");
    expect(formatKeys([" ", "<"])).toBe("<Space><lt>");
  });

  it("formatKeys is the inverse of parseKeys", () => {
    for (const text of ["3fx<CR>", "<Esc>", "f<Space>", "<lt>w", "<C-v>", "12G", ""]) {
      expect(formatKeys(parseKeys(text))).toBe(text);
    }
  });
});

describe("keyFromEvent", () => {
  const press = (key: string, mods: Partial<Record<"ctrlKey" | "altKey" | "metaKey", boolean>>) =>
    keyFromEvent({ key, ctrlKey: false, altKey: false, metaKey: false, ...mods });

  it("keyFromEvent maps printable keys to themselves", () => {
    expect(press("w", {})).toBe("w");
    expect(press("W", {})).toBe("W");
    expect(press(" ", {})).toBe(" ");
    expect(press("%", {})).toBe("%");
  });

  it("keyFromEvent maps special keys to their names", () => {
    expect(press("Escape", {})).toBe("<Esc>");
    expect(press("Enter", {})).toBe("<CR>");
    expect(press("Backspace", {})).toBe("<BS>");
    expect(press("Tab", {})).toBe("<Tab>");
  });

  it("keyFromEvent maps Ctrl plus a letter to a control key", () => {
    expect(press("v", { ctrlKey: true })).toBe("<C-v>");
    expect(press("V", { ctrlKey: true })).toBe("<C-v>");
  });

  it("keyFromEvent ignores dead keys, modifiers and navigation keys", () => {
    expect(press("Dead", {})).toBeNull();
    expect(press("Shift", {})).toBeNull();
    expect(press("ArrowLeft", {})).toBeNull();
    expect(press("1", { ctrlKey: true })).toBeNull();
  });

  it("keyFromEvent ignores Alt and Meta combinations", () => {
    expect(press("w", { altKey: true })).toBeNull();
    expect(press("w", { metaKey: true })).toBeNull();
  });
});
