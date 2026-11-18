import type { Generator, Problem } from "../core/problem";
import { createRng, retry, type Rng } from "../core/rng";
import { validateKinds, type KindSettings } from "./kinds";

export type EstimationKind = "complexity" | "magnitude" | "overflow";

export const ESTIMATION_KINDS: readonly EstimationKind[] = ["complexity", "magnitude", "overflow"];

export type EstimationSettings = KindSettings<EstimationKind>;

export const DEFAULT_ESTIMATION: EstimationSettings = { kinds: ESTIMATION_KINDS };

/** Complexity classes from the most to the least expensive (ADR-T07-1). */
export const COMPLEXITY_SCALE: readonly string[] = [
  "O(n!)",
  "O(2ⁿ·n)",
  "O(n³)",
  "O(n²)",
  "O(n√n)",
  "O(n log n)",
  "O(n)",
  "O(√n)",
  "O(log n)",
];

export type IntType = "int32" | "int64" | "nenhum";

export const OVERFLOW_CHOICES: readonly IntType[] = ["int32", "int64", "nenhum"];

export const INT32_MAX = 2n ** 31n - 1n;
export const INT64_MAX = 2n ** 63n - 1n;

/** The answer fits this many operations in the 1 s limit (10⁸ per second)… */
const FITS_OPS = 2e8;
/** …and the next class of the scale needs at least this many. */
const TOO_MANY_OPS = 1e9;
/** How many options a complexity or magnitude question shows. */
const OPTIONS = 4;

export function skillOfKind(kind: EstimationKind): string {
  return `estimation.${kind}`;
}

const SUPERSCRIPT_DIGITS = "⁰¹²³⁴⁵⁶⁷⁸⁹";

/** Non-negative integer written with superscript digits: 18 → "¹⁸". */
export function superscript(k: number): string {
  return [...String(k)].map((d) => SUPERSCRIPT_DIGITS[Number(d)]).join("");
}

/** The smallest signed type that holds a non-negative value. */
export function smallestType(value: bigint): IntType {
  if (value <= INT32_MAX) return "int32";
  if (value <= INT64_MAX) return "int64";
  return "nenhum";
}

/** "5000" below 10⁴; "10¹⁸" or "2·10⁵" (one significant digit) above. */
function shownNumber(n: number): string {
  if (n < 10_000) return String(n);
  const digits = String(n);
  const lead = digits.slice(0, 1);
  const power = `10${superscript(digits.length - 1)}`;
  return lead === "1" ? power : `${lead}·${power}`;
}

/** OPTIONS consecutive items of `all` that include the answer at `index`. */
function optionsAround<T>(
  rng: Rng,
  all: readonly T[],
  index: number,
): { choices: T[]; answer: string } {
  const start = rng.int(Math.max(0, index - OPTIONS + 1), Math.min(index, all.length - OPTIONS));
  return { choices: all.slice(start, start + OPTIONS), answer: String(index - start + 1) };
}

function factorial(n: number): number {
  // Past 30 the value is far beyond every threshold; stop multiplying.
  let f = 1;
  for (let i = 2; i <= Math.min(n, 30); i++) f *= i;
  return f;
}

/** Operations of each class of COMPLEXITY_SCALE for input size n (log base 2). */
const COST: readonly ((n: number) => number)[] = [
  factorial,
  (n) => 2 ** n * n,
  (n) => n ** 3,
  (n) => n ** 2,
  (n) => n * Math.sqrt(n),
  (n) => n * Math.log2(n),
  (n) => n,
  (n) => Math.sqrt(n),
  (n) => Math.log2(n),
];

/** Round bounds: 8 to 30, then d·10ᵏ up to 9·10¹⁸. */
const BOUNDS: readonly number[] = [
  ...Array.from({ length: 23 }, (_, i) => i + 8),
  ...Array.from({ length: 18 }, (_, k) =>
    Array.from({ length: 9 }, (_, d) => (d + 1) * 10 ** (k + 1)),
  )
    .flat()
    .filter((n) => n > 30),
];

/**
 * Each class of the scale with the bounds where it is clearly the largest
 * that fits: it fits FITS_OPS and the class above needs TOO_MANY_OPS.
 */
const CLASSES: readonly { readonly index: number; readonly bounds: readonly number[] }[] =
  COST.reduce<{ above: (n: number) => number; classes: { index: number; bounds: number[] }[] }>(
    ({ above, classes }, cost, index) => ({
      above: cost,
      classes: [
        ...classes,
        {
          index,
          bounds: BOUNDS.filter((n) => cost(n) <= FITS_OPS && above(n) >= TOO_MANY_OPS),
        },
      ],
    }),
    { above: () => Infinity, classes: [] },
  ).classes;

type Question = { prompt: string; choices: readonly string[]; answer: string };

function complexity(rng: Rng): Question {
  const { index, bounds } = rng.pick(CLASSES);
  const n = rng.pick(bounds);
  return {
    prompt: `n ≤ ${shownNumber(n)}, 1 s: maior complexidade viável?`,
    ...optionsAround(rng, COMPLEXITY_SCALE, index),
  };
}

type Growth = {
  readonly name: string;
  /** Input size drawn for the prompt. */
  readonly size: (rng: Rng) => number;
  readonly log10: (n: number) => number;
};

/** n = d·10ᵏ with k from 1 to 6. */
const roundSize = (rng: Rng) => rng.int(1, 9) * 10 ** rng.int(1, 6);

const GROWTHS: readonly Growth[] = [
  {
    name: "n log n",
    size: roundSize,
    log10: (n) => Math.log10(n) + Math.log10(Math.log2(n)),
  },
  { name: "n√n", size: roundSize, log10: (n) => 1.5 * Math.log10(n) },
  { name: "n²", size: roundSize, log10: (n) => 2 * Math.log10(n) },
  { name: "n³", size: roundSize, log10: (n) => 3 * Math.log10(n) },
  { name: "2ⁿ", size: (rng) => rng.int(10, 60), log10: (n) => n * Math.log10(2) },
  {
    name: "n!",
    size: (rng) => rng.int(6, 20),
    log10: (n) => {
      let sum = 0;
      for (let i = 2; i <= n; i++) sum += Math.log10(i);
      return sum;
    },
  },
];

/** Exponents of the powers of ten offered as magnitude options. */
const EXPONENTS: readonly number[] = Array.from({ length: 18 }, (_, k) => k + 1);

function magnitude(rng: Rng): Question {
  const { growth, n, exponent } = retry(
    () => {
      const growth = rng.pick(GROWTHS);
      const n = growth.size(rng);
      const value = growth.log10(n);
      return { growth, n, exponent: Math.round(value), fraction: value - Math.floor(value) };
    },
    // Far from the midpoint between two powers, so the nearest is clear.
    ({ exponent, fraction }) => exponent >= 2 && exponent <= 18 && Math.abs(fraction - 0.5) > 0.15,
  );
  const { choices, answer } = optionsAround(rng, EXPONENTS, EXPONENTS.indexOf(exponent));
  return {
    prompt: `O(${growth.name}) com n = ${shownNumber(n)}: quantas operações?`,
    choices: choices.map((k) => `10${superscript(k)}`),
    answer,
  };
}

type Expression = { text: string; value: bigint };

/** A uniform integer with exactly `digits` digits. */
function withDigits(rng: Rng, digits: number): number {
  return rng.int(10 ** (digits - 1), 10 ** digits - 1);
}

const EXPRESSIONS: readonly ((rng: Rng) => Expression)[] = [
  (rng) => {
    const a = withDigits(rng, rng.int(2, 11));
    const b = withDigits(rng, rng.int(2, 11));
    return { text: `${a} × ${b}`, value: BigInt(a) * BigInt(b) };
  },
  (rng) => {
    const n = rng.int(5, 30);
    let value = 1n;
    for (let i = 2n; i <= BigInt(n); i++) value *= i;
    return { text: `${n}!`, value };
  },
  (rng) => {
    const k = rng.int(10, 80);
    return { text: `2${superscript(k)}`, value: 2n ** BigInt(k) };
  },
  (rng) => {
    const n = BigInt(withDigits(rng, rng.int(4, 11)));
    return { text: `n(n + 1)/2 com n = ${n}`, value: (n * (n + 1n)) / 2n };
  },
];

function overflow(rng: Rng): Question {
  // The answer is drawn first so the three types are equally likely.
  const target = rng.pick(OVERFLOW_CHOICES);
  const expression = rng.pick(EXPRESSIONS);
  const { text } = retry(
    () => expression(rng),
    ({ value }) => smallestType(value) === target,
  );
  return {
    prompt: `${text} cabe em qual tipo?`,
    choices: OVERFLOW_CHOICES,
    answer: String(OVERFLOW_CHOICES.indexOf(target) + 1),
  };
}

const QUESTIONS: Readonly<Record<EstimationKind, (rng: Rng) => Question>> = {
  complexity,
  magnitude,
  overflow,
};

export const estimation: Generator<EstimationSettings> = {
  id: "estimation",

  generate(seed: number, params: EstimationSettings): Problem {
    if (validateKinds(params).length > 0) throw new RangeError("estimation settings need a kind");
    const rng = createRng(seed);
    const kind = rng.pick(params.kinds);
    const { prompt, choices, answer } = QUESTIONS[kind](rng);
    return { skill: skillOfKind(kind), prompt, answer, choices, seed, params };
  },

  check(problem: Problem, input: string): boolean {
    return input.trim() === problem.answer;
  },
};
