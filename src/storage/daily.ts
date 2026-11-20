import { DRILLS, type Drill } from "../stats/event";
import { mergeDaily, type DailyRow } from "../stats/summary";
import { readJson, tryWriteJson, type KeyValueStore } from "./kv";

export const DAILY_KEY = "popis.daily.v1";
export const QUOTA_NOTICE_KEY = "popis.quota-notice.v1";

const NUMBERS = ["n", "ok", "q1", "median", "q3"] as const;

export function isDailyRow(value: unknown): value is DailyRow {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r["day"] === "string" &&
    DRILLS.includes(r["drill"] as Drill) &&
    typeof r["config"] === "string" &&
    typeof r["kc"] === "string" &&
    NUMBERS.every((k) => typeof r[k] === "number" && Number.isFinite(r[k]))
  );
}

/** The valid rows of parsed JSON. */
export function parseDaily(value: unknown): DailyRow[] {
  return Array.isArray(value) ? value.filter(isDailyRow) : [];
}

/** The stored daily rows; corrupt or missing data loads as none. */
export function loadDaily(store: KeyValueStore): DailyRow[] {
  return parseDaily(readJson(store, DAILY_KEY));
}

/** Replaces the daily rows; false when the store refuses them. */
export function saveDaily(store: KeyValueStore, rows: readonly DailyRow[]): boolean {
  return tryWriteJson(store, DAILY_KEY, rows);
}

/** Adds rows to the stored ones, summing equal keys; false when the store refuses them. */
export function addDaily(store: KeyValueStore, rows: readonly DailyRow[]): boolean {
  return saveDaily(store, mergeDaily(loadDaily(store), rows));
}

/** Writes a plain string, ignoring a store that refuses it. */
function setQuietly(store: KeyValueStore, key: string, value: string): void {
  try {
    store.setItem(key, value);
  } catch {
    // Nothing else to do: the store is full.
  }
}

function noticeState(store: KeyValueStore): string | null {
  try {
    return store.getItem(QUOTA_NOTICE_KEY);
  } catch {
    return null;
  }
}

/** Remembers that the store filled up, unless the player already saw the notice. */
export function noteQuota(store: KeyValueStore): void {
  if (noticeState(store) === null) setQuietly(store, QUOTA_NOTICE_KEY, "pending");
}

export function quotaNoticePending(store: KeyValueStore): boolean {
  return noticeState(store) === "pending";
}

/** The player saw the notice; it never comes back. */
export function clearQuotaNotice(store: KeyValueStore): void {
  setQuietly(store, QUOTA_NOTICE_KEY, "shown");
}
