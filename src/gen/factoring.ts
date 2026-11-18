import type { Generator, Problem } from "../core/problem";
import { createRng, retry, type Rng } from "../core/rng";
import { sameValue } from "../math/fraction";
import { parse } from "../math/parse";
import {
  add,
  constant,
  equals,
  format,
  mul,
  sub,
  superscript,
  terms,
  variable,
  type Poly,
} from "../math/poly";

export type Level = 1 | 2 | 3 | 4 | 5 | 6;

export const LEVELS: readonly Level[] = [1, 2, 3, 4, 5, 6];

export type FactoringSettings = { readonly levels: readonly Level[] };

export type FactoringError = "no-level";

export const DEFAULT_FACTORING: FactoringSettings = { levels: [1] };

const SKILLS: Readonly<Record<Level, string>> = {
  1: "factoring.monic",
  2: "factoring.nonmonic",
  3: "factoring.common",
  4: "factoring.special",
  5: "factoring.cubic",
  6: "factoring.twovar",
};

/** Skill name of a level, e.g. "factoring.monic". */
export function skillOfLevel(level: Level): string {
  return SKILLS[level];
}

export function validateFactoring(settings: FactoringSettings): FactoringError[] {
  return settings.levels.length === 0 ? ["no-level"] : [];
}

/** Settings from untrusted JSON, or null when the shape or values are wrong. */
export function parseFactoringSettings(value: unknown): FactoringSettings | null {
  if (typeof value !== "object" || value === null) return null;
  const levels: unknown = (value as { levels?: unknown }).levels;
  if (!Array.isArray(levels)) return null;
  const parsed: Level[] = [];
  for (const level of levels as unknown[]) {
    if (!LEVELS.includes(level as Level)) return null;
    if (!parsed.includes(level as Level)) parsed.push(level as Level);
  }
  return validateFactoring({ levels: parsed }).length === 0 ? { levels: parsed } : null;
}

/** k · f₁ · f₂ · …, kept apart so the answer can be written factor by factor. */
type Factored = { readonly k: number; readonly factors: readonly Poly[] };

const x = variable("x");
const y = variable("y");

/** a·x + b */
function lin(a: number, b: number): Poly {
  return add(mul(constant(a), x), constant(b));
}

function gcd(a: number, b: number): number {
  return b === 0 ? Math.abs(a) : gcd(b, a % b);
}

function nonZero(rng: Rng, lo: number, hi: number): number {
  return retry(
    () => rng.int(lo, hi),
    (v) => v !== 0,
  );
}

const LEVEL_BUILDERS: Readonly<Record<Level, (rng: Rng) => Factored>> = {
  // (x − r)(x − s)
  1: (rng) => {
    const [r, s] = retry(
      () => [rng.int(-9, 9), rng.int(-9, 9)],
      ([r, s]) => r !== 0 || s !== 0,
    );
    return { k: 1, factors: [lin(1, -r), lin(1, -s)] };
  },
  // (ax + b)(cx + d), primitive factors, ac > 1
  2: (rng) => {
    const [a, b, c, d] = retry(
      () => [rng.int(1, 5), nonZero(rng, -9, 9), rng.int(1, 5), nonZero(rng, -9, 9)],
      ([a, b, c, d]) => a * c > 1 && gcd(a, b) === 1 && gcd(c, d) === 1,
    );
    return { k: 1, factors: [lin(a, b), lin(c, d)] };
  },
  // k(x − r)(x − s) or kx(x − r)(x − s)
  3: (rng) => {
    const k = rng.int(2, 6);
    const withX = rng.int(0, 1) === 1;
    const [r, s] = [nonZero(rng, -9, 9), nonZero(rng, -9, 9)];
    const quadratic = [lin(1, -r), lin(1, -s)];
    return { k, factors: withX ? [x, ...quadratic] : quadratic };
  },
  // a²x² − b², (ax ± b)², a³x³ ± b³
  4: (rng) => {
    const coprime = (aMax: number, bMax: number) =>
      retry(
        () => [rng.int(1, aMax), rng.int(1, bMax)] as const,
        ([a, b]) => gcd(a, b) === 1,
      );
    const sign = rng.pick([1, -1]);
    switch (rng.pick(["squares", "square", "cubes"] as const)) {
      case "squares": {
        const [a, b] = coprime(5, 12);
        return { k: 1, factors: [lin(a, -b), lin(a, b)] };
      }
      case "square": {
        const [a, b] = coprime(4, 9);
        return { k: 1, factors: [lin(a, sign * b), lin(a, sign * b)] };
      }
      case "cubes": {
        const [a, b] = coprime(2, 4);
        const quadratic = add(
          add(mul(constant(a * a), mul(x, x)), mul(constant(-sign * a * b), x)),
          constant(b * b),
        );
        return { k: 1, factors: [lin(a, sign * b), quadratic] };
      }
    }
  },
  // (x − r)(x − s)(x − t)
  5: (rng) => {
    const roots = retry(
      () => [rng.int(-6, 6), rng.int(-6, 6), rng.int(-6, 6)],
      (rs) => rs.some((r) => r !== 0),
    );
    return { k: 1, factors: roots.map((r) => lin(1, -r)) };
  },
  // (x − ry)(x − sy)
  6: (rng) => {
    const [r, s] = [nonZero(rng, -9, 9), nonZero(rng, -9, 9)];
    return {
      k: 1,
      factors: [sub(x, mul(constant(r), y)), sub(x, mul(constant(s), y))],
    };
  },
};

function expand({ k, factors }: Factored): Poly {
  return factors.reduce(mul, constant(k));
}

/** Answer text: "3(x − 1)(x − 3)", "2x(x − 5)", "(x − 2)²". */
function formatFactored({ k, factors }: Factored): string {
  const groups: { factor: Poly; count: number }[] = [];
  for (const factor of factors) {
    const group = groups.find((g) => equals(g.factor, factor));
    if (group === undefined) groups.push({ factor, count: 1 });
    else group.count++;
  }
  const text = groups.map(({ factor, count }) => {
    const ts = terms(factor);
    const bare = ts.length === 1 && ts[0]?.coef === 1;
    return (bare ? format(factor) : `(${format(factor)})`) + superscript(count);
  });
  return (k === 1 ? "" : String(k)) + text.join("");
}

export const factoring: Generator<FactoringSettings> = {
  id: "factoring",

  generate(seed: number, params: FactoringSettings): Problem {
    if (validateFactoring(params).length > 0) {
      throw new RangeError("invalid factoring settings: no level");
    }
    const rng = createRng(seed);
    const level = rng.pick(params.levels);
    const factored = LEVEL_BUILDERS[level](rng);
    return {
      skill: skillOfLevel(level),
      prompt: format(expand(factored)),
      answer: formatFactored(factored),
      seed,
      params,
    };
  },

  /**
   * ADR-T02-1: same expansion and the same number of non-constant factors;
   * the value is compared as a fraction (ADR-T08-1).
   */
  check(problem: Problem, input: string): boolean {
    const target = parse(problem.answer);
    const given = parse(input);
    return (
      target !== null &&
      given !== null &&
      given.factors === target.factors &&
      sameValue(given, target)
    );
  },
};
