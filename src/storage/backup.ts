import type { KeyValueStore } from "./history";

export type ImportResult =
  | { readonly ok: true; readonly added: number }
  | { readonly ok: false; readonly error: "invalid" | "app" | "version" };

/** `popis-YYYY-MM-DD.json`, by the UTC date of `now`. */
export function backupFileName(_now: number): string {
  throw new Error("todo");
}

/** Everything the app stores, as the text of a backup file. */
export function exportData(_store: KeyValueStore, _now: number): string {
  throw new Error("todo");
}

/** Merges a backup file into the store without duplicating anything. */
export function importData(_store: KeyValueStore, _text: string, _now: number): ImportResult {
  throw new Error("todo");
}
