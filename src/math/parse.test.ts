import { describe, expect, it } from "vitest";
import { MAX_EXPONENT, MAX_INPUT, parse, type Parsed } from "./parse";
import { add, constant, equals, mul, neg, pow, sub, variable, type Poly } from "./poly";

const x = variable("x");
const y = variable("y");
const c = constant;

/** x² − 2x − 15 = (x − 5)(x + 3) */
const quad: Poly = mul(sub(x, c(5)), add(x, c(3)));

function parsed(input: string): Parsed {
  const result = parse(input);
  if (result === null) throw new Error(`expected "${input}" to parse`);
  return result;
}

describe("parse: accepted forms", () => {
  it.each([
    "(x-5)(x+3)",
    "(x+3)(x-5)",
    "(x + 3) * (x - 5)",
    "(x−5)(x+3)",
    "(x-5)·(x+3)",
    "(x-5)×(x+3)",
    "  ( x - 5 ) ( x + 3 )  ",
    "(5-x)(-3-x)",
  ])("%s is (x − 5)(x + 3) with 2 factors", (input) => {
    const r = parsed(input);
    expect(equals(r.poly, quad)).toBe(true);
    expect(r.factors).toBe(2);
  });

  it("the expanded polynomial has 1 factor", () => {
    const r = parsed("x^2-2x-15");
    expect(equals(r.poly, quad)).toBe(true);
    expect(r.factors).toBe(1);
  });

  it("superscripts and ^ are exponents", () => {
    expect(equals(parsed("x²-2x-15").poly, quad)).toBe(true);
    expect(equals(parsed("x¹²").poly, pow(x, 12))).toBe(true);
  });

  it("a power counts its base that many times", () => {
    expect(parsed("(x-2)^2").factors).toBe(2);
    expect(parsed("(x-2)²").factors).toBe(2);
    expect(parsed("(x-2)(x-2)").factors).toBe(2);
    expect(equals(parsed("(x-2)^2").poly, parsed("(x-2)(x-2)").poly)).toBe(true);
    expect(parsed("((x-1)(x+1))^2").factors).toBe(4);
    expect(parsed("x^2").factors).toBe(2);
  });

  it("constants are not factors", () => {
    expect(parsed("2(x-1)(x+3)").factors).toBe(2);
    expect(parsed("(2x-2)(x+3)").factors).toBe(2);
    expect(equals(parsed("2(x-1)(x+3)").poly, parsed("(2x-2)(x+3)").poly)).toBe(true);
    expect(parsed("3").factors).toBe(0);
    expect(parsed("x^0").factors).toBe(0);
    expect(equals(parsed("x^0").poly, c(1))).toBe(true);
  });

  it("variables multiply implicitly", () => {
    expect(equals(parsed("xy").poly, mul(x, y))).toBe(true);
    expect(parsed("xy").factors).toBe(2);
    expect(parsed("x²y").factors).toBe(3);
    expect(parsed("2x").factors).toBe(1);
    expect(parsed("x(x-1)").factors).toBe(2);
  });

  it("a leading minus negates the product without changing the factor count", () => {
    const r = parsed("-(x-5)(x+3)");
    expect(equals(r.poly, neg(quad))).toBe(true);
    expect(r.factors).toBe(2);
  });

  it("two-variable factors", () => {
    const r = parsed("(x-2y)(x-3y)");
    expect(equals(r.poly, mul(sub(x, mul(c(2), y)), sub(x, mul(c(3), y))))).toBe(true);
    expect(r.factors).toBe(2);
  });

  it("a constant-valued sum counts as no factor", () => {
    expect(parsed("(x-x+1)(x+1)").factors).toBe(1);
  });
});

describe("parse: rejected input", () => {
  it.each([
    "",
    "   ",
    "(x-5",
    "x-5)",
    "()",
    "x^",
    "^2",
    "x^-1",
    "x^2.5",
    "2.5x",
    "x+",
    "x++1",
    "x--3",
    "1/2",
    "z",
    "a+1",
    "(x+1)^2^2",
  ])("%j is rejected", (input) => {
    expect(parse(input)).toBeNull();
  });

  it(`exponents above ${MAX_EXPONENT} are rejected`, () => {
    expect(parse(`x^${MAX_EXPONENT}`)).not.toBeNull();
    expect(parse(`x^${MAX_EXPONENT + 1}`)).toBeNull();
  });

  it(`input longer than ${MAX_INPUT} characters is rejected`, () => {
    const factor = "(x+1)";
    const long = factor.repeat(Math.ceil((MAX_INPUT + 1) / factor.length));
    expect(long.length).toBeGreaterThan(MAX_INPUT);
    expect(parse(long)).toBeNull();
  });

  it("coefficients beyond safe integers are rejected", () => {
    expect(parse("99999999999999999x")).toBeNull();
    expect(parse("(1000000x+1)^12")).toBeNull();
  });

  it("huge degrees are rejected", () => {
    expect(parse("((x^12)^2)^2")).toBeNull();
  });
});

describe("parse: summands", () => {
  it("summands are the signed top-level terms", () => {
    const r = parsed("(x+3)^2 - 7");
    expect(r.summands).toHaveLength(2);
    expect(equals(r.summands[0]?.poly ?? c(0), pow(add(x, c(3)), 2))).toBe(true);
    expect(r.summands[0]?.factors).toBe(2);
    expect(equals(r.summands[1]?.poly ?? c(0), c(-7))).toBe(true);
  });

  it("a leading minus belongs to the first summand", () => {
    const r = parsed("-x + 2");
    expect(equals(r.summands[0]?.poly ?? c(0), neg(x))).toBe(true);
  });

  it("parenthesised sums count as one summand", () => {
    expect(parsed("(x + 1)(x - 1)").summands).toHaveLength(1);
    expect(parsed("x^2 + 7x - 15").summands).toHaveLength(3);
  });
});
