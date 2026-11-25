import { describe, expect, it } from "vitest";
import { checkStlAnswer, tokenizeOutput } from "./check";
import { STRING_NPOS } from "./sim";

// T42 AC-3: token-by-token checker, whitespace-insensitive, rejects -0 and npos as -1,
// accepts 1/true equivalence only when boolalpha is active.

describe("stl answer checker (AC-3)", () => {
  it("tokenizes whitespace, tabs and newlines cleanly", () => {
    expect(tokenizeOutput("  1   2\t3\n\n")).toEqual(["1", "2", "3"]);
    expect(tokenizeOutput("   \n  ")).toEqual([]);
  });

  it("accepts exact matches, extra spaces, tabs and trailing newlines", () => {
    const accepted: readonly (readonly [string, string, boolean?])[] = [
      ["42", "42"],
      ["  42  \n", "42"],
      ["1   2\t3\n\n", "1 2 3"],
      ["1\n2\n3\n", "1 2 3"],
      ["0", "0"],
      [String(STRING_NPOS), String(STRING_NPOS)],
      ["true", "true", true],
      ["1", "true", true],
      ["false", "false", true],
      ["0", "false", true],
    ];
    for (const [typed, expected, boolalpha] of accepted) {
      const res = checkStlAnswer(typed, expected, boolalpha ? { boolalpha: true } : {});
      expect(res.ok, `typed="${typed}" expected="${expected}" boolalpha=${String(boolalpha)}`).toBe(
        true,
      );
    }
  });

  it("rejects wrong order, npos as -1, extra elements, -0 and bool/int without boolalpha", () => {
    const rejected: readonly (readonly [string, string, boolean?])[] = [
      ["", "1"],
      ["2 1", "1 2"],
      ["1 2 3", "1 2"],
      ["1", "1 2"],
      ["-1", String(STRING_NPOS)],
      ["npos", String(STRING_NPOS)],
      ["-0", "0"],
      ["+5", "5"],
      ["true", "1", false],
      ["false", "0", false],
      ["true", "1"],
      ["false", "0"],
    ];
    for (const [typed, expected, boolalpha] of rejected) {
      const res = checkStlAnswer(typed, expected, boolalpha ? { boolalpha: true } : {});
      expect(res.ok, `typed="${typed}" expected="${expected}"`).toBe(false);
      expect(res.reason.length).toBeGreaterThan(0);
    }
  });

  it("gives specific feedback for -0, npos as -1 and missing boolalpha", () => {
    expect(checkStlAnswer("-0", "0").reason).toContain("-0");
    expect(checkStlAnswer("-1", String(STRING_NPOS)).reason).toContain("npos");
    expect(checkStlAnswer("true", "1").reason).toContain("boolalpha");
  });
});
