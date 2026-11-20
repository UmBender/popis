import { describe, expect, it } from "vitest";
import { textObject } from "./textobjects";

// AC-3: text objects return the range an operator acts on. `end` is the last
// character when `inclusive`, and the first one left out otherwise.

const at = (line: number, col: number) => ({ line, col });

describe("textObject", () => {
  it("iw selects the word under the cursor", () => {
    expect(textObject(["foo bar"], at(0, 5), "iw", 1)).toEqual({
      start: at(0, 4),
      end: at(0, 6),
      inclusive: true,
    });
  });

  it("aw takes the blanks after the word", () => {
    expect(textObject(["foo bar baz"], at(0, 1), "aw", 1)).toEqual({
      start: at(0, 0),
      end: at(0, 3),
      inclusive: true,
    });
  });

  it("aw on the last word takes the blanks before it", () => {
    expect(textObject(["foo bar"], at(0, 5), "aw", 1)).toEqual({
      start: at(0, 3),
      end: at(0, 6),
      inclusive: true,
    });
  });

  it("iW treats punctuation as part of the word", () => {
    expect(textObject(["a foo.bar b"], at(0, 3), "iW", 1)).toEqual({
      start: at(0, 2),
      end: at(0, 8),
      inclusive: true,
    });
  });

  it("a count extends the word object", () => {
    expect(textObject(["foo bar baz"], at(0, 0), "iw", 3)).toEqual({
      start: at(0, 0),
      end: at(0, 6),
      inclusive: true,
    });
  });

  it("i( selects the text inside the parentheses", () => {
    expect(textObject(["f(ab)"], at(0, 3), "i(", 1)).toEqual({
      start: at(0, 2),
      end: at(0, 3),
      inclusive: true,
    });
  });

  it("a( includes the parentheses and ib is the same object", () => {
    const a = textObject(["f(ab) x"], at(0, 3), "a(", 1);
    expect(a).toEqual({ start: at(0, 1), end: at(0, 4), inclusive: true });
    expect(textObject(["f(ab) x"], at(0, 3), "ab", 1)).toEqual(a);
    expect(textObject(["f(ab) x"], at(0, 3), "ib", 1)).toEqual(
      textObject(["f(ab) x"], at(0, 3), "i(", 1),
    );
  });

  it("a count of two takes the enclosing pair", () => {
    expect(textObject(["(a (b) c)"], at(0, 4), "i(", 2)).toEqual({
      start: at(0, 1),
      end: at(0, 7),
      inclusive: true,
    });
  });

  it("i( on an empty pair is an empty range", () => {
    expect(textObject(["f()"], at(0, 1), "i(", 1)).toEqual({
      start: at(0, 2),
      end: at(0, 2),
      inclusive: false,
    });
  });

  it("i( finds the next pair on the line when the cursor is before it", () => {
    expect(textObject(["x = f(a)"], at(0, 0), "i(", 1)).toEqual({
      start: at(0, 6),
      end: at(0, 6),
      inclusive: true,
    });
  });

  it("brackets count the parentheses inside quotes, as the Vim object does", () => {
    expect(textObject(['f(")", a)'], at(0, 7), "i(", 1)).toBeNull();
  });

  it('i" selects the text inside the quotes and a" the quotes with a blank', () => {
    expect(textObject(['say "hi" ok'], at(0, 6), 'i"', 1)).toEqual({
      start: at(0, 5),
      end: at(0, 7),
      inclusive: false,
    });
    expect(textObject(['say "hi" ok'], at(0, 6), 'a"', 1)).toEqual({
      start: at(0, 4),
      end: at(0, 9),
      inclusive: false,
    });
  });

  it("a quote object skips an escaped quote", () => {
    const hit = textObject(['x "a\\"b" y'], at(0, 4), 'i"', 1);
    expect(hit).toEqual({ start: at(0, 3), end: at(0, 7), inclusive: false });
  });

  it("an object with nothing to select returns null", () => {
    expect(textObject(["plain text"], at(0, 3), "i(", 1)).toBeNull();
    expect(textObject(["plain text"], at(0, 3), 'i"', 1)).toBeNull();
    expect(textObject(["plain text"], at(0, 3), "i?", 1)).toBeNull();
  });
});
