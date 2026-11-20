import type { KeyValueStore } from "./history";

export const MIGRATED_KEY = "popis.migrated.v1";

/**
 * Turns the data of the old keys into events and daily rows, once. Never
 * deletes the old keys. True when it ran now; false when it had already
 * run or a write failed (it then runs again next time).
 */
export function migrate(_store: KeyValueStore, _now: number): boolean {
  throw new Error("todo");
}
