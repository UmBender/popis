import { sessionEvents } from "../stats/derive";
import { DRILLS, eventKey, type Drill, type TrainingEvent } from "../stats/event";
import { fitBudget, retire } from "../stats/retention";
import { mergeDaily, summarize } from "../stats/summary";
import { loadDaily, noteQuota, saveDaily } from "./daily";
import { loadHistory } from "./history";
import { readJson, tryWriteJson, type KeyValueStore } from "./kv";

export type { Drill, TrainingEvent } from "../stats/event";

export const EVENTS_KEY = "popis.events.v1";
/** Most characters the stored raw events may take. */
export const EVENTS_BUDGET = 600_000;

/** Compact form on disk: `[at, drill, config, kc, ok, timeMs, extra]`. */
function encode(e: TrainingEvent): unknown[] {
  return [e.at, e.drill, e.config, e.kc, e.ok ? 1 : 0, e.timeMs, e.extra];
}

const size = (events: readonly TrainingEvent[]): number =>
  JSON.stringify(events.map(encode)).length;

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** The valid events of parsed JSON in the compact form. */
export function decodeEvents(value: unknown): TrainingEvent[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item: unknown): TrainingEvent[] => {
    if (!Array.isArray(item) || item.length !== 7) return [];
    const [at, drill, config, kc, ok, timeMs, extra] = item as unknown[];
    const fields = extra as Record<string, unknown> | null;
    if (
      !isNumber(at) ||
      !DRILLS.includes(drill as Drill) ||
      typeof config !== "string" ||
      typeof kc !== "string" ||
      !isNumber(timeMs) ||
      typeof extra !== "object" ||
      fields === null ||
      !isNumber(fields["seed"]) ||
      !isNumber(fields["i"])
    ) {
      return [];
    }
    return [{ at, drill, config, kc, ok: ok === 1, timeMs, extra } as unknown as TrainingEvent];
  });
}

/** The raw events (every drill but calculation), oldest first. */
export function loadEvents(store: KeyValueStore): TrainingEvent[] {
  return decodeEvents(readJson(store, EVENTS_KEY));
}

/** Oldest first; equal times keep their order. */
const byTime = (events: readonly TrainingEvent[]): TrainingEvent[] =>
  [...events].sort((a, b) => a.at - b.at);

/** Raw events plus the events of the stored sessions, oldest first. */
export function loadAllEvents(store: KeyValueStore): TrainingEvent[] {
  return byTime([...loadHistory(store).flatMap(sessionEvents), ...loadEvents(store)]);
}

/**
 * Adds events to the raw ones and applies the retention: 90 days and the
 * size budget. What leaves becomes daily rows. When the store refuses a
 * write, more days are summarized until it fits; false when it never does.
 */
export function recordEvents(
  store: KeyValueStore,
  events: readonly TrainingEvent[],
  now: number,
): boolean {
  const known = new Map<string, TrainingEvent>();
  for (const event of [...loadEvents(store), ...events]) {
    if (!known.has(eventKey(event))) known.set(eventKey(event), event);
  }
  const retired = retire(byTime([...known.values()]), now);
  const fitted = fitBudget(retired.keep, EVENTS_BUDGET, size);
  let keep = fitted.keep;
  let spill = [...retired.old, ...fitted.old];
  const before = loadDaily(store);
  let refused = false;
  for (;;) {
    // The events first: shrinking them is what makes room for the rows.
    const stored = tryWriteJson(store, EVENTS_KEY, keep.map(encode));
    if (stored && (spill.length === 0 || saveDaily(store, mergeDaily(before, summarize(spill))))) {
      break;
    }
    refused = true;
    if (keep.length === 0) {
      noteQuota(store);
      return false;
    }
    const shrunk = fitBudget(keep, size(keep) - 1, size);
    keep = shrunk.keep;
    spill = [...spill, ...shrunk.old];
  }
  if (refused) noteQuota(store);
  return true;
}
