import { describe, expect, it } from "vitest";
import {
  arithmetic,
  DEFAULT_ARITHMETIC,
  parseArithmeticSettings,
  validateArithmetic,
  type ArithmeticSettings,
  type Operation,
} from "./arithmetic";

function only(op: Operation, patch: Partial<ArithmeticSettings> = {}): ArithmeticSettings {
  return { ...DEFAULT_ARITHMETIC, operations: [op], ...patch };
}

/** Splits a prompt like "12 × 34" into its operands and symbol. */
function parsePrompt(prompt: string): { a: number; sym: string; b: number } {
  const match = /^(\d+) ([+−×÷]) (\d+)$/.exec(prompt);
  if (match === null) throw new Error(`unexpected prompt: ${prompt}`);
  return { a: Number(match[1]), sym: match[2] ?? "", b: Number(match[3]) };
}

describe("DEFAULT_ARITHMETIC", () => {
  it("matches the zetamac defaults", () => {
    expect(DEFAULT_ARITHMETIC).toEqual({
      operations: ["add", "sub", "mul", "div"],
      addLeft: { min: 2, max: 100 },
      addRight: { min: 2, max: 100 },
      mulLeft: { min: 2, max: 12 },
      mulRight: { min: 2, max: 100 },
    });
  });
});

describe("arithmetic.generate", () => {
  it("addition shows a + b and expects the sum", () => {
    const p = arithmetic.generate(1, only("add", { addLeft: { min: 7, max: 7 } }));
    const { a, sym, b } = parsePrompt(p.prompt);
    expect(sym).toBe("+");
    expect(a).toBe(7);
    expect(p.answer).toBe(String(a + b));
    expect(p.skill).toBe("arithmetic.add");
  });

  it("subtraction is addition in reverse", () => {
    const settings = only("sub", { addLeft: { min: 5, max: 5 }, addRight: { min: 9, max: 9 } });
    const p = arithmetic.generate(1, settings);
    expect(p.prompt).toBe("14 − 5");
    expect(p.answer).toBe("9");
    expect(p.skill).toBe("arithmetic.sub");
  });

  it("multiplication shows a × b and expects the product", () => {
    const settings = only("mul", { mulLeft: { min: 12, max: 12 }, mulRight: { min: 3, max: 3 } });
    const p = arithmetic.generate(1, settings);
    expect(p.prompt).toBe("12 × 3");
    expect(p.answer).toBe("36");
    expect(p.skill).toBe("arithmetic.mul");
  });

  it("division is multiplication in reverse", () => {
    const settings = only("div", { mulLeft: { min: 12, max: 12 }, mulRight: { min: 3, max: 3 } });
    const p = arithmetic.generate(1, settings);
    expect(p.prompt).toBe("36 ÷ 12");
    expect(p.answer).toBe("3");
    expect(p.skill).toBe("arithmetic.div");
  });

  it("uses only enabled operations", () => {
    const settings: ArithmeticSettings = { ...DEFAULT_ARITHMETIC, operations: ["mul", "div"] };
    for (let seed = 0; seed < 200; seed++) {
      const { sym } = parsePrompt(arithmetic.generate(seed, settings).prompt);
      expect(["×", "÷"]).toContain(sym);
    }
  });

  it("eventually uses every enabled operation", () => {
    const skills = new Set<string>();
    for (let seed = 0; seed < 200; seed++) {
      skills.add(arithmetic.generate(seed, DEFAULT_ARITHMETIC).skill);
    }
    expect(skills).toEqual(
      new Set(["arithmetic.add", "arithmetic.sub", "arithmetic.mul", "arithmetic.div"]),
    );
  });

  it("same seed and params give the same problem", () => {
    expect(arithmetic.generate(2024, DEFAULT_ARITHMETIC)).toEqual(
      arithmetic.generate(2024, DEFAULT_ARITHMETIC),
    );
  });

  it("problem carries its seed and params", () => {
    const p = arithmetic.generate(77, DEFAULT_ARITHMETIC);
    expect(p.seed).toBe(77);
    expect(p.params).toEqual(DEFAULT_ARITHMETIC);
  });
});

describe("arithmetic.check", () => {
  const problem = arithmetic.generate(
    1,
    only("add", { addLeft: { min: 20, max: 20 }, addRight: { min: 22, max: 22 } }),
  );

  it("accepts the exact answer", () => {
    expect(arithmetic.check(problem, "42")).toBe(true);
  });

  it("accepts the answer with surrounding spaces", () => {
    expect(arithmetic.check(problem, " 42 ")).toBe(true);
  });

  it("rejects a prefix of the answer", () => {
    expect(arithmetic.check(problem, "4")).toBe(false);
  });

  it("rejects a wrong answer", () => {
    expect(arithmetic.check(problem, "43")).toBe(false);
  });

  it("rejects leading zeros", () => {
    expect(arithmetic.check(problem, "042")).toBe(false);
  });

  it("rejects empty input", () => {
    expect(arithmetic.check(problem, "")).toBe(false);
  });
});

describe("validateArithmetic", () => {
  it("accepts the defaults", () => {
    expect(validateArithmetic(DEFAULT_ARITHMETIC)).toEqual([]);
  });

  it("rejects no operation", () => {
    expect(validateArithmetic({ ...DEFAULT_ARITHMETIC, operations: [] })).toContain("no-operation");
  });

  it("rejects an inverted range of an enabled operation", () => {
    expect(validateArithmetic(only("add", { addLeft: { min: 10, max: 2 } }))).toContain(
      "inverted-range",
    );
  });

  it("ignores ranges of disabled operations", () => {
    expect(validateArithmetic(only("add", { mulLeft: { min: 10, max: 2 } }))).toEqual([]);
  });

  it("rejects non-integer bounds", () => {
    expect(validateArithmetic(only("mul", { mulRight: { min: 1.5, max: 3 } }))).toContain(
      "non-integer",
    );
  });

  it("rejects bounds outside 0 to 1,000,000", () => {
    expect(validateArithmetic(only("add", { addRight: { min: -1, max: 3 } }))).toContain(
      "out-of-bounds",
    );
    expect(validateArithmetic(only("add", { addRight: { min: 1, max: 1_000_001 } }))).toContain(
      "out-of-bounds",
    );
  });

  it("rejects division when the divisor range includes zero", () => {
    expect(validateArithmetic(only("div", { mulLeft: { min: 0, max: 12 } }))).toContain(
      "division-by-zero",
    );
  });

  it("allows zero in multiplication without division", () => {
    expect(validateArithmetic(only("mul", { mulLeft: { min: 0, max: 12 } }))).toEqual([]);
  });

  it("generate throws on invalid settings", () => {
    expect(() => arithmetic.generate(1, { ...DEFAULT_ARITHMETIC, operations: [] })).toThrow();
  });
});

describe("parseArithmeticSettings", () => {
  it("round-trips valid settings through JSON", () => {
    const settings = only("mul", { mulLeft: { min: 3, max: 9 } });
    expect(parseArithmeticSettings(JSON.parse(JSON.stringify(settings)))).toEqual(settings);
  });

  it("returns null for the wrong shape", () => {
    expect(parseArithmeticSettings(null)).toBeNull();
    expect(parseArithmeticSettings({ operations: ["add"] })).toBeNull();
    expect(parseArithmeticSettings({ ...DEFAULT_ARITHMETIC, operations: ["pow"] })).toBeNull();
    expect(
      parseArithmeticSettings({ ...DEFAULT_ARITHMETIC, addLeft: { min: "2", max: 3 } }),
    ).toBeNull();
  });

  it("returns null for invalid settings", () => {
    expect(parseArithmeticSettings({ ...DEFAULT_ARITHMETIC, operations: [] })).toBeNull();
  });

  it("drops duplicate operations", () => {
    expect(
      parseArithmeticSettings({ ...DEFAULT_ARITHMETIC, operations: ["add", "add"] })?.operations,
    ).toEqual(["add"]);
  });
});
