import type { TrainingEvent } from "./event";
import { DAY_MS, dayStart } from "./summary";

/** Days of raw events kept. */
export const RAW_DAYS = 90;

export type Split = { readonly keep: TrainingEvent[]; readonly old: TrainingEvent[] };

/** Splits events (sorted by time) into the last 90 days and the older ones. */
export function retire(events: readonly TrainingEvent[], now: number): Split {
  const cutoff = dayStart(now) - RAW_DAYS * DAY_MS;
  return {
    keep: events.filter((e) => e.at >= cutoff),
    old: events.filter((e) => e.at < cutoff),
  };
}

/**
 * Moves the oldest whole days out of `events` (sorted by time) until
 * `size(keep)` is at most `budget`.
 */
export function fitBudget(
  events: readonly TrainingEvent[],
  budget: number,
  size: (events: readonly TrainingEvent[]) => number,
): Split {
  let from = 0;
  while (from < events.length && size(events.slice(from)) > budget) {
    const day = dayStart((events[from] as TrainingEvent).at);
    while (from < events.length && dayStart((events[from] as TrainingEvent).at) === day) from++;
  }
  return { keep: events.slice(from), old: events.slice(0, from) };
}
