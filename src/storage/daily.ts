import type { DailyRow } from "../stats/summary";
import type { KeyValueStore } from "./history";

export const DAILY_KEY = "popis.daily.v1";
export const QUOTA_NOTICE_KEY = "popis.quota-notice.v1";

/** The stored daily rows; corrupt or missing data loads as none. */
export function loadDaily(_store: KeyValueStore): DailyRow[] {
  throw new Error("todo");
}

/** Replaces the daily rows; false when the store refuses them. */
export function saveDaily(_store: KeyValueStore, _rows: readonly DailyRow[]): boolean {
  throw new Error("todo");
}

/** Adds rows to the stored ones, summing equal keys; false when the store refuses them. */
export function addDaily(_store: KeyValueStore, _rows: readonly DailyRow[]): boolean {
  throw new Error("todo");
}

/** Remembers that the store filled up, unless the player already saw the notice. */
export function noteQuota(_store: KeyValueStore): void {
  throw new Error("todo");
}

export function quotaNoticePending(_store: KeyValueStore): boolean {
  throw new Error("todo");
}

/** The player saw the notice; it never comes back. */
export function clearQuotaNotice(_store: KeyValueStore): void {
  throw new Error("todo");
}
