import { describe, expect, it } from "vitest";
import { formatFraction, fraction, sameValue } from "./fraction";
import { add, constant, equals, mul, neg, variable } from "./poly";

const x = variable("x");
const c = constant;

describe("fraction", () => {
  it("fraction divides out the common factor of the numerator and the denominator", () => {
    const f = fraction(add(mul(c(2), x), c(4)), 6);
    expect(equals(f.poly, add(x, c(2)))).toBe(true);
    expect(f.denom).toBe(3);
  });

  it("fraction moves the sign to the numerator", () => {
    const f = fraction(x, -2);
    expect(equals(f.poly, neg(x))).toBe(true);
    expect(f.denom).toBe(2);
  });

  it("fraction of zero has denominator 1", () => {
    expect(fraction(c(0), 5).denom).toBe(1);
  });

  it("fraction rejects a zero or fractional denominator", () => {
    expect(() => fraction(x, 0)).toThrow(RangeError);
    expect(() => fraction(x, 1.5)).toThrow(RangeError);
  });
});

describe("sameValue", () => {
  it("sameValue compares by cross-multiplication", () => {
    expect(sameValue({ poly: mul(c(2), x), denom: 4 }, { poly: x, denom: 2 })).toBe(true);
    expect(sameValue(fraction(x, 2), fraction(x, 3))).toBe(false);
    expect(sameValue(fraction(x, 2), fraction(neg(x), 2))).toBe(false);
  });

  it("sameValue is false when the cross product leaves the safe integers", () => {
    const big = 2 ** 52;
    expect(sameValue({ poly: c(big), denom: 3 }, { poly: c(big + 1), denom: 7 })).toBe(false);
  });
});

describe("formatFraction", () => {
  it("formatFraction wraps a sum in parentheses over the denominator", () => {
    expect(formatFraction(fraction(add(mul(x, x), x), 2))).toBe("(x² + x)/2");
    expect(formatFraction(fraction(add(mul(x, x), x), 2), { x: "n" })).toBe("(n² + n)/2");
  });

  it("formatFraction writes a monomial numerator without parentheses", () => {
    expect(formatFraction(fraction(x, 2), { x: "n" })).toBe("n/2");
    expect(formatFraction(fraction(neg(mul(x, x)), 3), { x: "n" })).toBe("−n²/3");
  });

  it("formatFraction omits a denominator of 1", () => {
    expect(formatFraction(fraction(add(x, c(1)), 1), { x: "n" })).toBe("n + 1");
    expect(formatFraction(fraction(c(0), 7))).toBe("0");
  });
});
