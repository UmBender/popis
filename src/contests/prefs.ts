import { readJson, tryWriteJson, type KeyValueStore } from "../storage/kv";
import { isSite, SITES, type Site } from "./model";

export const CONTESTS_KEY = "popis.contests";

export type ContestsPrefs = {
  readonly sites: readonly Site[];
};

const DEFAULT_PREFS: ContestsPrefs = { sites: [...SITES] };

/** Loads saved site filter preferences from `popis.contests`. */
export function loadContestsPrefs(store: KeyValueStore): ContestsPrefs {
  const raw = readJson(store, CONTESTS_KEY);
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return DEFAULT_PREFS;
  const list = (raw as { sites?: unknown }).sites;
  if (!Array.isArray(list)) return DEFAULT_PREFS;
  const picked = new Set<Site>();
  for (const item of list) {
    if (isSite(item)) picked.add(item);
  }
  return { sites: SITES.filter((s) => picked.has(s)) };
}

/** Saves site filter preferences to `popis.contests`. */
export function saveContestsPrefs(store: KeyValueStore, prefs: ContestsPrefs): void {
  tryWriteJson(store, CONTESTS_KEY, { sites: prefs.sites });
}
