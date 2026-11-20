import type { Drill, EventExtra, TrainingEvent } from "../stats/event";
import { recordEvents } from "./events";
import { loadHistory, saveHistory, trimHistory } from "./history";
import { readJson, tryWriteJson, type KeyValueStore } from "./kv";
import { loadTextResults } from "./text-typing";
import { loadTypingResults } from "./typing";
import { loadVimEditResults, loadVimResults } from "./vim";

export const MIGRATED_KEY = "popis.migrated.v1";

/** A round without data per item: one event of kind "round". */
function roundEvent(
  at: number,
  drill: Drill,
  config: string,
  timeMs: number,
  seed: number,
  data: Omit<EventExtra, "seed" | "i" | "legacy">,
): TrainingEvent {
  return { at, drill, config, kc: "round", ok: true, timeMs, extra: { seed, i: 0, legacy: true, ...data } };
}

/** The old per-round results of Vim and both typing drills as events. */
function legacyEvents(store: KeyValueStore): TrainingEvent[] {
  return [
    ...loadVimResults(store).map((r) =>
      roundEvent(r.finishedAt, "vim.motion", `L${String(r.level)}`, r.durationS * 1000, r.seed, {
        reached: r.reached,
        skipped: r.skipped,
        efficiency: r.efficiency,
      }),
    ),
    ...loadVimEditResults(store).map((r) =>
      roundEvent(r.finishedAt, "vim.edit", "edit", r.durationS * 1000, r.seed, {
        reached: r.reached,
        skipped: r.skipped,
        efficiency: r.efficiency,
      }),
    ),
    ...loadTypingResults(store).map((r) =>
      roundEvent(r.finishedAt, "typing.code", r.language, r.timeMs, r.seed, {
        snippet: r.snippetId,
        wpm: r.wpm,
        accuracy: r.accuracy,
        errors: r.errors,
      }),
    ),
    ...loadTextResults(store).map((r) =>
      roundEvent(r.finishedAt, "typing.text", r.config, r.timeMs, r.seed, {
        wpm: r.wpm,
        raw: r.raw,
        accuracy: r.accuracy,
        chars: r.chars,
      }),
    ),
  ];
}

/**
 * Turns the data of the old keys into events and daily rows, once. Never
 * deletes the old keys. True when it ran now; false when it had already
 * run or a write failed (it then runs again next time).
 */
export function migrate(store: KeyValueStore, now: number): boolean {
  if (readJson(store, MIGRATED_KEY) !== undefined) return false;
  const { keep, dropped } = trimHistory(loadHistory(store));
  if (dropped.length > 0) saveHistory(store, keep, dropped);
  const events = legacyEvents(store);
  if (events.length > 0 && !recordEvents(store, events, now)) return false;
  return tryWriteJson(store, MIGRATED_KEY, 1);
}
