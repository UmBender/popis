import { DAY_MS } from "./summary";

export const MIN_CURVE_ROUNDS = 8;
export const PLATEAU_WINDOW = 10;
export const WEEK_MS = 7 * DAY_MS;
export const WEEKLY_WINDOW_WEEKS = 4;

export type RoundPoint = {
  readonly at: number;
  readonly score: number;
  readonly assisted?: boolean;
};

export type PowerLawFit = {
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly predict: (n: number) => number;
};

export type Plateau = {
  readonly since: number;
  readonly slope: number;
};

export type GoalLine = {
  readonly target: number;
  readonly deadline: string;
  readonly setAt: number;
  readonly baseline: number;
};

export type GoalStatus = {
  readonly expected: number;
  readonly delta: number;
  readonly above: boolean;
};

export function parseDay(_day: string): number | null {
  throw new Error("todo");
}

export function theilSenSlope(_points: readonly (readonly [number, number])[]): number | null {
  throw new Error("todo");
}

export function fitPowerLaw(_points: readonly RoundPoint[]): PowerLawFit | null {
  throw new Error("todo");
}

export function detectPlateau(_points: readonly RoundPoint[]): Plateau | null {
  throw new Error("todo");
}

export function weeklyRate(_points: readonly RoundPoint[], _now: number): number | null {
  throw new Error("todo");
}

export function evaluateGoal(
  _goal: GoalLine,
  _latest: { readonly at: number; readonly score: number },
): GoalStatus | null {
  throw new Error("todo");
}
