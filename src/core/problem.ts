/** Any value that survives a JSON round trip. */
export type JsonValue =
  null | boolean | number | string | readonly JsonValue[] | { readonly [key: string]: JsonValue };

/** One question shown to the player. Plain data, so it can be stored. */
export type Problem = {
  /** Fine-grained skill, e.g. "arithmetic.mul"; stats group by it. */
  readonly skill: string;
  /** Text shown to the player. */
  readonly prompt: string;
  /** Canonical answer; the generator's `check` always accepts it. */
  readonly answer: string;
  /**
   * Options of a multiple-choice question, shown numbered from 1; the
   * answer is then the correct option's number (ADR-T07-1).
   */
  readonly choices?: readonly string[];
  /** Seed that, with `params`, regenerates exactly this problem. */
  readonly seed: number;
  /** Generator parameters used to build the problem. */
  readonly params: JsonValue;
};

/** Builds problems of one family and judges answers to them. */
export interface Generator<P> {
  readonly id: string;
  /** Pure: the same seed and params always give the same problem. */
  generate(seed: number, params: P): Problem;
  /** Whether `input` (as typed, so far) is a correct answer to `problem`. */
  check(problem: Problem, input: string): boolean;
}
