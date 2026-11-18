import type { Generator, Problem } from "../core/problem";
import { createRng, retry, type Rng } from "../core/rng";
import { add, constant, format, mul, variable } from "../math/poly";
import { validateKinds, type KindSettings } from "./kinds";

export type DivisionKind = "cpp-div" | "cpp-mod" | "floor" | "ceil" | "mod" | "inequality";

export const DIVISION_KINDS: readonly DivisionKind[] = [
  "cpp-div",
  "cpp-mod",
  "floor",
  "ceil",
  "mod",
  "inequality",
];

export type DivisionSettings = KindSettings<DivisionKind>;

export const DEFAULT_DIVISION: DivisionSettings = { kinds: DIVISION_KINDS };

/** `a·x + b rel c`, solved for the extreme integer x. */
export type Inequality = {
  readonly a: number;
  readonly b: number;
  readonly rel: "≤" | "≥";
  readonly c: number;
};

export function skillOfKind(kind: DivisionKind): string {
  return `division.${kind}`;
}

/** C++ `a / b`: truncates toward zero. */
export function cppDiv(a: number, b: number): number {
  return Math.trunc(a / b);
}

/** C++ `a % b`: has the sign of `a` (JavaScript's `%` matches C++). */
export function cppMod(a: number, b: number): number {
  return a % b;
}

export function floorDiv(a: number, b: number): number {
  return Math.floor(a / b);
}

export function ceilDiv(a: number, b: number): number {
  return Math.ceil(a / b);
}

/** Mathematical `a mod b` for b > 0, in [0, b). */
export function mathMod(a: number, b: number): number {
  return ((a % b) + b) % b;
}

/**
 * The bounded side of the solution set and its extreme integer:
 * a·x + b ≤ c with a > 0 (or ≥ with a < 0) bounds x above, so the answer is
 * the largest x; otherwise x is bounded below and the answer is the smallest.
 */
export function inequalityAnswer(q: Inequality): { want: "max" | "min"; x: number } {
  const boundedAbove = (q.rel === "≤") === q.a > 0;
  return boundedAbove
    ? { want: "max", x: floorDiv(q.c - q.b, q.a) }
    : { want: "min", x: ceilDiv(q.c - q.b, q.a) };
}

/** Integers as shown in prompts, with a real minus sign. */
function shown(n: number): string {
  return n < 0 ? `−${-n}` : String(n);
}

const OPERATIONS: Readonly<
  Record<
    Exclude<DivisionKind, "inequality">,
    { prompt: (a: string, b: string) => string; solve: (a: number, b: number) => number }
  >
> = {
  "cpp-div": { prompt: (a, b) => `C++: ${a} / ${b}`, solve: cppDiv },
  "cpp-mod": { prompt: (a, b) => `C++: ${a} % ${b}`, solve: cppMod },
  floor: { prompt: (a, b) => `⌊${a} / ${b}⌋`, solve: floorDiv },
  ceil: { prompt: (a, b) => `⌈${a} / ${b}⌉`, solve: ceilDiv },
  mod: { prompt: (a, b) => `${a} mod ${b}`, solve: mathMod },
};

function inequality(rng: Rng): { prompt: string; answer: number } {
  const q = retry(
    (): Inequality => ({
      a: rng.pick([-1, 1]) * rng.int(2, 9),
      b: rng.int(-20, 20),
      rel: rng.pick(["≤", "≥"] as const),
      c: rng.int(-60, 60),
    }),
    // A non-integer bound is where rounding matters.
    (q) => (q.c - q.b) % q.a !== 0,
  );
  const { want, x } = inequalityAnswer(q);
  const lhs = format(add(mul(constant(q.a), variable("x")), constant(q.b)));
  return {
    prompt: `${want === "max" ? "maior" : "menor"} x inteiro: ${lhs} ${q.rel} ${shown(q.c)}`,
    answer: x,
  };
}

export const division: Generator<DivisionSettings> = {
  id: "division",

  generate(seed: number, params: DivisionSettings): Problem {
    if (validateKinds(params).length > 0) throw new RangeError("division settings need a kind");
    const rng = createRng(seed);
    const kind = rng.pick(params.kinds);
    let prompt: string;
    let answer: number;
    if (kind === "inequality") {
      ({ prompt, answer } = inequality(rng));
    } else {
      const [a, b] = retry(
        () =>
          [rng.int(-99, 99), (kind === "mod" ? 1 : rng.pick([-1, 1])) * rng.int(2, 12)] as const,
        // Negatives and a non-zero remainder are where the conventions differ.
        ([a, b]) => (a < 0 || b < 0) && a % b !== 0,
      );
      const op = OPERATIONS[kind];
      prompt = op.prompt(shown(a), shown(b));
      answer = op.solve(a, b);
    }
    return { skill: skillOfKind(kind), prompt, answer: String(answer), seed, params };
  },

  check(problem: Problem, input: string): boolean {
    return input.trim().replace(/^−/, "-") === problem.answer;
  },
};
