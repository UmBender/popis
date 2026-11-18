import type { Generator, Problem } from "../core/problem";
import { createRng, retry, type Rng } from "../core/rng";
import { formatFraction, fraction, sameValue, type Fraction } from "../math/fraction";
import { parse, type ParseOptions } from "../math/parse";
import { add, constant, degree, evaluate, format, mul, terms, variable } from "../math/poly";
import { validateKinds, type KindSettings } from "./kinds";

export type SumsKind = "sum" | "loop";

export const SUMS_KINDS: readonly SumsKind[] = ["sum", "loop"];

export type SumsSettings = KindSettings<SumsKind>;

export const DEFAULT_SUMS: SumsSettings = { kinds: SUMS_KINDS };

export function skillOfKind(kind: SumsKind): string {
  return `sums.${kind}`;
}

/** Answers are written and read in n, stored as x (ADR-T08-1). */
const IN_N: ParseOptions = { variables: { n: "x" } };
const N_NAME = { x: "n" } as const;

/** Points n = 1…FIT give the polynomial; n = FIT + 1…SAMPLES check it. */
const FIT = 5;
const SAMPLES = 10;
/** (FIT − 1)!: clears every denominator of the Newton form. */
const SCALE = 24;

const x = variable("x");

/** Leading entries of the forward-difference table: v₀, Δv₀, Δ²v₀… */
function differences(values: readonly number[]): number[] {
  const leading: number[] = [];
  let row = [...values];
  while (row.length > 0) {
    const previous = row;
    leading.push(previous[0] as number);
    row = previous.slice(1).map((v, i) => v - (previous[i] as number));
  }
  return leading;
}

/**
 * Closed form in x of `count(n)` for n ≥ 1: interpolated by finite
 * differences on the first points and checked on the others; null when
 * the count is not a polynomial of low degree.
 */
export function closedForm(count: (n: number) => number): Fraction | null {
  const values = Array.from({ length: SAMPLES }, (_, i) => count(i + 1));
  // SCALE · P(n) = Σₖ Δᵏv₀ · (SCALE / k!) · (n − 1)(n − 2)…(n − k)
  let numerator = constant(0);
  let falling = constant(1);
  let factorial = 1;
  differences(values.slice(0, FIT)).forEach((d, k) => {
    if (k > 0) {
      falling = mul(falling, add(x, constant(-k)));
      factorial *= k;
    }
    numerator = add(numerator, mul(constant((d * SCALE) / factorial), falling));
  });
  const f = fraction(numerator, SCALE);
  const fits = values.every((v, i) => evaluate(f.poly, i + 1) === v * f.denom);
  return fits ? f : null;
}

type Built = { readonly prompt: string; readonly count: (n: number) => number };

/** Σ over i of a polynomial of degree 1 or 2, from 1 to n or from 0 to n − 1. */
function buildSum(rng: Rng): Built {
  const f = retry(
    () =>
      add(
        add(mul(constant(rng.int(-3, 3)), mul(x, x)), mul(constant(rng.int(-5, 5)), x)),
        constant(rng.int(-5, 5)),
      ),
    (p) => degree(p) >= 1,
  );
  const from = rng.pick([0, 1]);
  const text = format(f, { x: "i" });
  const body = terms(f).length > 1 ? `(${text})` : text;
  return {
    prompt: `Σᵢ₌${from === 1 ? "₁ⁿ" : "₀ⁿ⁻¹"} ${body}`,
    count: (n) => {
      let total = 0;
      for (let i = from; i < from + n; i++) total += evaluate(f, i);
      return total;
    },
  };
}

/** A loop bound: its C++ text and its value given the outer variables. */
type Bound = {
  readonly text: string;
  readonly value: (outer: readonly number[], n: number) => number;
};

type Loop = { readonly name: string; readonly start: Bound; readonly end: Bound };

const LOOP_VARIABLES = ["i", "j", "k"] as const;

function outerBound(outer: readonly number[], index: number): number {
  return outer[index] as number;
}

/** 1 to 3 nested `for` loops around `ops++`. */
function buildLoops(rng: Rng): Built {
  const depth = rng.int(1, 3);
  const loops: Loop[] = LOOP_VARIABLES.slice(0, depth).map((name, level) => {
    const outer = LOOP_VARIABLES.slice(0, level);
    const starts: Bound[] = [
      { text: "0", value: () => 0 },
      { text: "1", value: () => 1 },
      ...outer.flatMap((v, index): Bound[] => [
        { text: v, value: (env) => outerBound(env, index) },
        { text: `${v} + 1`, value: (env) => outerBound(env, index) + 1 },
      ]),
    ];
    const ends: Bound[] = [
      { text: "n", value: (_, n) => n },
      ...outer.map((v, index): Bound => ({ text: v, value: (env) => outerBound(env, index) })),
    ];
    return { name, start: rng.pick(starts), end: rng.pick(ends) };
  });
  const lines = loops.map(
    ({ name, start, end }, level) =>
      `${"  ".repeat(level)}for (int ${name} = ${start.text}; ${name} < ${end.text}; ${name}++)`,
  );
  const run = (level: number, env: readonly number[], n: number): number => {
    const loop = loops[level];
    if (loop === undefined) return 1;
    let ops = 0;
    for (let v = loop.start.value(env, n); v < loop.end.value(env, n); v++) {
      ops += run(level + 1, [...env, v], n);
    }
    return ops;
  };
  return {
    prompt: ["// quantas vezes ops++ roda?", ...lines, `${"  ".repeat(depth)}ops++;`].join("\n"),
    count: (n) => run(0, [], n),
  };
}

export const sums: Generator<SumsSettings> = {
  id: "sums",

  generate(seed: number, params: SumsSettings): Problem {
    if (validateKinds(params).length > 0) throw new RangeError("sums settings need a kind");
    const rng = createRng(seed);
    const kind = rng.pick(params.kinds);
    const { prompt, answer } = retry(
      () => {
        const built = kind === "sum" ? buildSum(rng) : buildLoops(rng);
        return { prompt: built.prompt, answer: closedForm(built.count) };
      },
      (b) => b.answer !== null && degree(b.answer.poly) >= 1,
    );
    return {
      skill: skillOfKind(kind),
      prompt,
      answer: formatFraction(answer as Fraction, N_NAME),
      seed,
      params,
    };
  },

  /** Any expression in n with the value of the answer (ADR-T08-1). */
  check(problem: Problem, input: string): boolean {
    const target = parse(problem.answer, IN_N);
    const given = parse(input, IN_N);
    return target !== null && given !== null && sameValue(given, target);
  },
};
