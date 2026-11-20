import type { TrainingEvent } from "../stats/event";
import type { KeyValueStore } from "./history";

export type { Drill, TrainingEvent } from "../stats/event";

export const EVENTS_KEY = "popis.events.v1";
/** Most characters the stored raw events may take. */
export const EVENTS_BUDGET = 600_000;

/** The raw events (every drill but calculation), oldest first. */
export function loadEvents(_store: KeyValueStore): TrainingEvent[] {
  throw new Error("todo");
}

/** Raw events plus the events of the stored sessions, oldest first. */
export function loadAllEvents(_store: KeyValueStore): TrainingEvent[] {
  throw new Error("todo");
}

/**
 * Adds events to the raw ones and applies the retention: 90 days and the
 * size budget. What leaves becomes daily rows. False when the store
 * refused something.
 */
export function recordEvents(
  _store: KeyValueStore,
  _events: readonly TrainingEvent[],
  _now: number,
): boolean {
  throw new Error("todo");
}
