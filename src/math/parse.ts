import {
  add,
  constant,
  degree,
  isConstant,
  mul,
  neg,
  PolyOverflowError,
  pow,
  variable,
  type Poly,
  type Variable,
} from "./poly";

/** Longest accepted input, in characters. */
export const MAX_INPUT = 80;
/** Largest accepted exponent. */
export const MAX_EXPONENT = 12;
/** Largest total degree of any intermediate result. */
export const MAX_DEGREE = 24;

/** A polynomial and the non-constant factors it was written with. */
export type Summand = {
  /** The expanded polynomial, with the sign it was written with. */
  readonly poly: Poly;
  /** Non-constant factors of the product (ADR-T02-1). */
  readonly factors: number;
};

export type Parsed = Summand & {
  /** The top-level terms, in the order written. */
  readonly summands: readonly Summand[];
};

type Op = "+" | "-" | "*" | "^" | "(" | ")";
type Token =
  | { readonly kind: "int"; readonly value: number }
  | { readonly kind: "var"; readonly name: Variable }
  | { readonly kind: "op"; readonly op: Op };

const SUPERSCRIPT_DIGITS = "⁰¹²³⁴⁵⁶⁷⁸⁹";
/** Characters that mean an operator, including the ones the app displays. */
const OPERATORS: Readonly<Record<string, Op>> = {
  "+": "+",
  "-": "-",
  "−": "-",
  "*": "*",
  "·": "*",
  "×": "*",
  "^": "^",
  "(": "(",
  ")": ")",
};

/** Thrown inside the parser for any invalid input; `parse` turns it into null. */
class Reject extends Error {}

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  const chars = [...input];
  let i = 0;
  const run = (accept: (c: string) => boolean): string => {
    let s = "";
    while (i < chars.length && accept(chars[i] ?? "")) s += chars[i++];
    return s;
  };
  const integer = (digits: string): Token => {
    const value = Number(digits);
    if (!Number.isSafeInteger(value)) throw new Reject("integer too large");
    return { kind: "int", value };
  };
  while (i < chars.length) {
    const c = chars[i] ?? "";
    if (/\s/.test(c)) {
      i++;
    } else if (/[0-9]/.test(c)) {
      tokens.push(integer(run((d) => /[0-9]/.test(d))));
    } else if (SUPERSCRIPT_DIGITS.includes(c)) {
      const digits = run((d) => SUPERSCRIPT_DIGITS.includes(d));
      tokens.push({ kind: "op", op: "^" });
      tokens.push(integer([...digits].map((d) => SUPERSCRIPT_DIGITS.indexOf(d)).join("")));
    } else if (c === "x" || c === "y") {
      tokens.push({ kind: "var", name: c });
      i++;
    } else if (c in OPERATORS) {
      tokens.push({ kind: "op", op: OPERATORS[c] as Op });
      i++;
    } else {
      throw new Reject(`unexpected character ${c}`);
    }
  }
  return tokens;
}

function limitDegree(poly: Poly): Poly {
  if (degree(poly) > MAX_DEGREE) throw new Reject("degree too large");
  return poly;
}

/**
 * Recursive descent over:
 *   expr    := [+|-] term ((+|-) term)*
 *   term    := factor ([*] factor)*      (juxtaposition multiplies)
 *   factor  := primary [^ int]
 *   primary := int | x | y | ( expr )
 */
class Parser {
  private pos = 0;

  constructor(private readonly tokens: readonly Token[]) {}

  parse(): Parsed {
    const result = this.expr();
    if (this.pos !== this.tokens.length) throw new Reject("trailing input");
    return result;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private isOp(op: Op): boolean {
    const t = this.peek();
    return t?.kind === "op" && t.op === op;
  }

  private startsFactor(): boolean {
    const t = this.peek();
    return t !== undefined && (t.kind !== "op" || t.op === "(");
  }

  private expr(): Parsed {
    let negative = false;
    if (this.isOp("+") || this.isOp("-")) {
      negative = this.isOp("-");
      this.pos++;
    }
    const first = this.term();
    const summands: Summand[] = [negative ? { ...first, poly: neg(first.poly) } : first];
    let poly = summands[0]?.poly ?? first.poly;
    while (this.isOp("+") || this.isOp("-")) {
      const minus = this.isOp("-");
      this.pos++;
      const next = this.term();
      const signed = minus ? { ...next, poly: neg(next.poly) } : next;
      summands.push(signed);
      poly = limitDegree(add(poly, signed.poly));
    }
    // A single product keeps its factors; a sum is one factor unless it is constant.
    const factors = summands.length === 1 ? first.factors : isConstant(poly) ? 0 : 1;
    return { poly, factors, summands };
  }

  private term(): Summand {
    let { poly, factors } = this.factor();
    for (;;) {
      if (this.isOp("*")) this.pos++;
      else if (!this.startsFactor()) break;
      const next = this.factor();
      if (degree(poly) + degree(next.poly) > MAX_DEGREE) throw new Reject("degree too large");
      poly = mul(poly, next.poly);
      factors += next.factors;
    }
    return { poly, factors };
  }

  private factor(): Summand {
    const base = this.primary();
    if (!this.isOp("^")) return base;
    this.pos++;
    const exponent = this.tokens[this.pos++];
    if (exponent?.kind !== "int" || exponent.value > MAX_EXPONENT) {
      throw new Reject("invalid exponent");
    }
    const n = exponent.value;
    if (degree(base.poly) * n > MAX_DEGREE) throw new Reject("degree too large");
    return { poly: pow(base.poly, n), factors: base.factors * n };
  }

  private primary(): Summand {
    const t = this.tokens[this.pos++];
    if (t === undefined) throw new Reject("unexpected end");
    if (t.kind === "int") return { poly: constant(t.value), factors: 0 };
    if (t.kind === "var") return { poly: variable(t.name), factors: 1 };
    if (t.op !== "(") throw new Reject(`unexpected ${t.op}`);
    const inner = this.expr();
    if (!this.isOp(")")) throw new Reject("missing )");
    this.pos++;
    return { poly: inner.poly, factors: isConstant(inner.poly) ? 0 : inner.factors };
  }
}

/** Parses a typed expression, or returns null when it is not valid. */
export function parse(input: string): Parsed | null {
  if (input.length > MAX_INPUT) return null;
  try {
    const tokens = tokenize(input);
    if (tokens.length === 0) return null;
    return new Parser(tokens).parse();
  } catch (error) {
    if (error instanceof Reject || error instanceof PolyOverflowError) return null;
    throw error;
  }
}
