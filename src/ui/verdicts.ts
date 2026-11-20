import type { Attempt } from "../session/engine";

/** A mark of the submissions queue (docs/architecture/Shell.md). */
export type Verdict = "AC" | "WA" | "SK";

/** One problem in the results scoreboard, in the ICPC convention. */
export type Cell = {
  /** "+", "+n", "?" or "−n". */
  readonly mark: string;
  readonly tone: "ac" | "wa" | "sk";
  /** The time of the problem, or "pulada". */
  readonly note: string;
};

export type ScoreRow = {
  /** The label of the problem type. */
  readonly skill: string;
  readonly cells: readonly Cell[];
};

/**
 * The submissions queue: each correction is a WA, then each problem ends in
 * AC or SK; `pending` corrections belong to the problem on screen.
 */
export function verdicts(log: readonly Attempt[], pending: number): Verdict[] {
  void log;
  void pending;
  throw new Error("todo");
}

/** One row per problem type, one cell per problem, in order of appearance. */
export function scoreboard(log: readonly Attempt[]): ScoreRow[] {
  void log;
  throw new Error("todo");
}

/** Scores as block characters, lowest ▁ and highest █. */
export function sparkline(values: readonly number[]): string {
  void values;
  throw new Error("todo");
}
