import type { Generator, Problem } from "../core/problem";
import type { KindSettings } from "./kinds";

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

export function skillOfKind(_kind: DivisionKind): string {
  throw new Error("todo");
}

/** C++ `a / b`: truncates toward zero. */
export function cppDiv(_a: number, _b: number): number {
  throw new Error("todo");
}

/** C++ `a % b`: has the sign of `a`. */
export function cppMod(_a: number, _b: number): number {
  throw new Error("todo");
}

export function floorDiv(_a: number, _b: number): number {
  throw new Error("todo");
}

export function ceilDiv(_a: number, _b: number): number {
  throw new Error("todo");
}

/** Mathematical `a mod b` for b > 0, in [0, b). */
export function mathMod(_a: number, _b: number): number {
  throw new Error("todo");
}

/** The bounded side of the solution set and its extreme integer. */
export function inequalityAnswer(_q: Inequality): { want: "max" | "min"; x: number } {
  throw new Error("todo");
}

export const division: Generator<DivisionSettings> = {
  id: "division",
  generate(_seed: number, _params: DivisionSettings): Problem {
    throw new Error("todo");
  },
  check(_problem: Problem, _input: string): boolean {
    throw new Error("todo");
  },
};
