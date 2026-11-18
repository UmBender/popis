import { describe, expect, it } from "vitest";
import {
  add,
  constant,
  degree,
  equals,
  format,
  isConstant,
  monomial,
  mul,
  neg,
  PolyOverflowError,
  pow,
  sub,
  terms,
  variable,
  type Poly,
} from "./poly";

const x = variable("x");
const y = variable("y");
const c = constant;

/** x² − 2x − 15 */
const quad: Poly = add(add(mul(x, x), mul(c(-2), x)), c(-15));

describe("construction and arithmetic", () => {
  it("zero coefficients disappear", () => {
    expect(terms(sub(x, x))).toEqual([]);
    expect(terms(constant(0))).toEqual([]);
    expect(terms(monomial(0, 3, 1))).toEqual([]);
  });

  it("product of linear factors expands", () => {
    const product = mul(sub(x, c(5)), add(x, c(3)));
    expect(equals(product, quad)).toBe(true);
  });

  it("equality ignores construction order", () => {
    const a = add(add(c(-15), mul(c(-2), x)), mul(x, x));
    expect(equals(a, quad)).toBe(true);
    expect(equals(quad, add(quad, c(1)))).toBe(false);
  });

  it("negation flips every coefficient", () => {
    expect(equals(neg(quad), mul(c(-1), quad))).toBe(true);
  });

  it("pow repeats multiplication and pow 0 is 1", () => {
    expect(equals(pow(add(x, c(1)), 2), add(add(mul(x, x), mul(c(2), x)), c(1)))).toBe(true);
    expect(equals(pow(quad, 0), c(1))).toBe(true);
  });

  it("two variables multiply independently", () => {
    expect(terms(mul(x, y))).toEqual([{ ex: 1, ey: 1, coef: 1 }]);
  });

  it("degree is the total degree; constants have degree 0 and zero has -1", () => {
    expect(degree(quad)).toBe(2);
    expect(degree(mul(mul(x, x), y))).toBe(3);
    expect(degree(c(7))).toBe(0);
    expect(degree(c(0))).toBe(-1);
  });

  it("isConstant is true only without variables", () => {
    expect(isConstant(c(4))).toBe(true);
    expect(isConstant(c(0))).toBe(true);
    expect(isConstant(x)).toBe(false);
  });

  it("coefficients beyond safe integers throw PolyOverflowError", () => {
    const big = c(2 ** 40);
    expect(() => mul(big, big)).toThrow(PolyOverflowError);
    expect(() => add(c(Number.MAX_SAFE_INTEGER), c(1))).toThrow(PolyOverflowError);
  });

  it("terms list the highest total degree first, then the highest power of x", () => {
    const p = add(add(mul(x, y), mul(x, x)), add(mul(y, y), c(1)));
    expect(terms(p).map((t) => [t.ex, t.ey])).toEqual([
      [2, 0],
      [1, 1],
      [0, 2],
      [0, 0],
    ]);
  });
});

describe("format", () => {
  it("writes descending powers with a real minus sign", () => {
    expect(format(quad)).toBe("x² − 2x − 15");
  });

  it("omits coefficient 1 and writes −1 as a sign", () => {
    expect(format(add(neg(mul(x, x)), x))).toBe("−x² + x");
  });

  it("writes two-variable terms in x, y order", () => {
    const p = add(sub(mul(x, x), mul(c(5), mul(x, y))), mul(c(6), mul(y, y)));
    expect(format(p)).toBe("x² − 5xy + 6y²");
  });

  it("writes constants and zero", () => {
    expect(format(c(-7))).toBe("−7");
    expect(format(c(0))).toBe("0");
    expect(format(c(1))).toBe("1");
  });

  it("writes multi-digit superscripts", () => {
    expect(format(pow(x, 12))).toBe("x¹²");
  });
});
