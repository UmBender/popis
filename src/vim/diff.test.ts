import { describe, expect, it } from "vitest";
import { diffText } from "./diff";

// AC-8: the character diff behind the highlight of the before and the after.

const marked = (text: string, mask: readonly boolean[]) =>
  [...text].filter((_, i) => mask[i]).join("");

describe("diffText", () => {
  it("equal texts mark nothing", () => {
    const { aMask, bMask } = diffText("foo bar", "foo bar");
    expect(aMask.some(Boolean)).toBe(false);
    expect(bMask.some(Boolean)).toBe(false);
  });

  it("marks the characters to remove in the first text and to add in the second", () => {
    const { aMask, bMask } = diffText("int x = 0;", "long long x = 0;");
    expect(marked("int x = 0;", aMask)).toBe("int");
    expect(marked("long long x = 0;", bMask)).toBe("long long");
  });

  it("a deleted line is marked in the first text only", () => {
    const { aMask, bMask } = diffText("a\nb\nc", "a\nc");
    expect(marked("a\nb\nc", aMask)).toBe("b\n");
    expect(bMask.some(Boolean)).toBe(false);
  });

  it("an inserted piece is marked in the second text only", () => {
    const { aMask, bMask } = diffText("a[i]", "a[i + 1]");
    expect(aMask.some(Boolean)).toBe(false);
    expect(marked("a[i + 1]", bMask)).toBe(" + 1");
  });

  it("the masks have one entry per character", () => {
    const { aMask, bMask } = diffText("abc", "xyzw");
    expect(aMask).toHaveLength(3);
    expect(bMask).toHaveLength(4);
    expect(aMask.every(Boolean)).toBe(true);
    expect(bMask.every(Boolean)).toBe(true);
  });
});
