import type { Drill, TrainingEvent } from "./event";

export const DAY_MS = 86_400_000;

/** One day of one item class, summarized (ADR-T22-1). */
export type DailyRow = {
  /** UTC date, `YYYY-MM-DD`. */
  readonly day: string;
  readonly drill: Drill;
  readonly config: string;
  readonly kc: string;
  readonly n: number;
  readonly ok: number;
  /** Quartiles of the time, in milliseconds. */
  readonly q1: number;
  readonly median: number;
  readonly q3: number;
};

/** UTC date of a time, `YYYY-MM-DD`. */
export function dayOf(_at: number): string {
  throw new Error("todo");
}

/** Midnight UTC of the day of `at`. */
export function dayStart(_at: number): number {
  throw new Error("todo");
}

/** First, second and third quartile of a non-empty list, by linear interpolation. */
export function quartiles(_times: readonly number[]): readonly [number, number, number] {
  throw new Error("todo");
}

/** One row per day, drill, config and kc, sorted by those. */
export function summarize(_events: readonly TrainingEvent[]): DailyRow[] {
  throw new Error("todo");
}

/** Joins two lists of rows, adding the counts of equal keys. */
export function mergeDaily(_a: readonly DailyRow[], _b: readonly DailyRow[]): DailyRow[] {
  throw new Error("todo");
}

/** Joins two lists of rows of the same data, keeping the larger row of each key. */
export function unionDaily(_a: readonly DailyRow[], _b: readonly DailyRow[]): DailyRow[] {
  throw new Error("todo");
}
