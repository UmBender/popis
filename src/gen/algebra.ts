import type { Generator, Problem } from "../core/problem";
import { createRng, retry, type Rng } from "../core/rng";
import { sameValue } from "../math/fraction";
import { parse, type Summand } from "../math/parse";
import {
  add,
  constant,
  degree,
  equals,
  format,
  isConstant,
  mul,
  pow,
  terms,
  variable,
  type Poly,
} from "../math/poly";
import { validateKinds, type KindSettings } from "./kinds";

export type AlgebraKind = "expand" | "simplify" | "square" | "divide";

export const ALGEBRA_KINDS: readonly AlgebraKind[] = ["expand", "simplify", "square", "divide"];

export type AlgebraSettings = KindSettings<AlgebraKind>;

export const DEFAULT_ALGEBRA: AlgebraSettings = { kinds: ALGEBRA_KINDS };

export function skillOfKind(kind: AlgebraKind): string {
  return `algebra.${kind}`;
}

const x = variable("x");

/** a·x + b */
function lin(a: number, b: number): Poly {
  return add(mul(constant(a), x), constant(b));
}

function nonZero(rng: Rng, lo: number, hi: number): number {
  return retry(
    () => rng.int(lo, hi),
    (v) => v !== 0,
  );
}

function paren(p: Poly): string {
  return `(${format(p)})`;
}

/** Coefficient text before a variable or parenthesis: "", "3"… (sign handled apart). */
function coefficient(k: number): string {
  return Math.abs(k) === 1 ? "" : String(Math.abs(k));
}

type Built = { readonly text: string; readonly value: Poly };

function expand(rng: Rng): Built {
  switch (rng.int(0, 2)) {
    case 0: {
      const f = lin(rng.int(1, 4), nonZero(rng, -9, 9));
      const g = lin(rng.int(1, 4), nonZero(rng, -9, 9));
      return { text: paren(f) + paren(g), value: mul(f, g) };
    }
    case 1: {
      const f = lin(1, nonZero(rng, -9, 9));
      return { text: `${paren(f)}²`, value: pow(f, 2) };
    }
    default: {
      const f = lin(1, nonZero(rng, -9, 9));
      const q = add(
        add(mul(x, x), mul(constant(nonZero(rng, -6, 6)), x)),
        constant(nonZero(rng, -6, 6)),
      );
      return { text: paren(f) + paren(q), value: mul(f, q) };
    }
  }
}

/** One term of a sum to simplify, written without its sign. */
function simplifyTerm(rng: Rng, first: boolean): { k: number; text: string; value: Poly } {
  const k = nonZero(rng, -6, 6);
  const shape = first
    ? rng.pick(["lin", "xlin"] as const)
    : rng.pick(["lin", "xlin", "x", "const"] as const);
  const inner = lin(1, nonZero(rng, -9, 9));
  switch (shape) {
    case "lin":
      return { k, text: coefficient(k) + paren(inner), value: mul(constant(k), inner) };
    case "xlin":
      return {
        k,
        text: `${coefficient(k)}x${paren(inner)}`,
        value: mul(constant(k), mul(x, inner)),
      };
    case "x":
      return { k, text: `${coefficient(k)}x`, value: mul(constant(k), x) };
    case "const":
      return { k, text: String(Math.abs(k)), value: constant(k) };
  }
}

function simplify(rng: Rng): Built {
  return retry(
    (): Built => {
      const count = rng.int(2, 3);
      let text = "";
      let value = constant(0);
      for (let i = 0; i < count; i++) {
        const term = simplifyTerm(rng, i === 0);
        const sign = term.k < 0 ? "−" : "+";
        text += i === 0 ? (term.k < 0 ? "−" : "") + term.text : ` ${sign} ${term.text}`;
        value = add(value, term.value);
      }
      return { text, value };
    },
    (built) => degree(built.value) >= 1,
  );
}

const PREFIX: Readonly<Record<AlgebraKind, string>> = {
  expand: "Expanda: ",
  simplify: "Simplifique: ",
  square: "Complete o quadrado: ",
  divide: "Divida: ",
};

function build(kind: AlgebraKind, rng: Rng): { body: string; answer: string } {
  switch (kind) {
    case "expand":
    case "simplify": {
      const { text, value } = kind === "expand" ? expand(rng) : simplify(rng);
      return { body: text, answer: format(value) };
    }
    case "square": {
      const h = nonZero(rng, -9, 9);
      const k = nonZero(rng, -20, 20);
      return {
        body: format(add(pow(lin(1, h), 2), constant(k))),
        answer: `${paren(lin(1, h))}² ${k < 0 ? "−" : "+"} ${Math.abs(k)}`,
      };
    }
    case "divide": {
      const divisor = lin(1, -nonZero(rng, -5, 5));
      const quotient = add(
        add(mul(x, x), mul(constant(rng.int(-9, 9)), x)),
        constant(rng.int(-9, 9)),
      );
      return {
        body: `${paren(mul(quotient, divisor))} ÷ ${paren(divisor)}`,
        answer: format(quotient),
      };
    }
  }
}

/** (x + h)² for an integer h, written as a product of two factors. */
function isMonicSquare(s: Summand): boolean {
  const ts = terms(s.poly);
  const h = (ts.find((t) => t.ex === 1)?.coef ?? 0) / 2;
  return s.factors === 2 && Number.isInteger(h) && equals(s.poly, pow(lin(1, h), 2));
}

export const algebra: Generator<AlgebraSettings> = {
  id: "algebra",

  generate(seed: number, params: AlgebraSettings): Problem {
    if (validateKinds(params).length > 0) throw new RangeError("algebra settings need a kind");
    const rng = createRng(seed);
    const kind = rng.pick(params.kinds);
    const { body, answer } = build(kind, rng);
    return { skill: skillOfKind(kind), prompt: PREFIX[kind] + body, answer, seed, params };
  },

  /**
   * Same value as the answer, written in the kind's form: a square plus a
   * constant for "square", otherwise expanded (no parentheses, one summand
   * per monomial of the answer).
   */
  check(problem: Problem, input: string): boolean {
    const target = parse(problem.answer);
    const given = parse(input);
    if (target === null || given === null || !sameValue(given, target)) return false;
    if (problem.skill === skillOfKind("square")) {
      const [a, b] = given.summands;
      if (given.summands.length !== 2 || a === undefined || b === undefined) return false;
      return (isMonicSquare(a) && isConstant(b.poly)) || (isMonicSquare(b) && isConstant(a.poly));
    }
    return !input.includes("(") && given.summands.length === terms(target.poly).length;
  },
};
