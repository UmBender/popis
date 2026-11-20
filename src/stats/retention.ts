import type { TrainingEvent } from "./event";

/** Days of raw events kept. */
export const RAW_DAYS = 90;

export type Split = { readonly keep: TrainingEvent[]; readonly old: TrainingEvent[] };

/** Splits events (sorted by time) into the last 90 days and the older ones. */
export function retire(_events: readonly TrainingEvent[], _now: number): Split {
  throw new Error("todo");
}

/**
 * Moves the oldest whole days out of `events` (sorted by time) until
 * `size(keep)` is at most `budget`.
 */
export function fit(
  _events: readonly TrainingEvent[],
  _budget: number,
  _size: (events: readonly TrainingEvent[]) => number,
): Split {
  throw new Error("todo");
}
