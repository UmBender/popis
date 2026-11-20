import { dayOf, unionDaily, type DailyRow } from "../stats/summary";
import { DAILY_KEY, loadDaily, parseDaily, saveDaily } from "./daily";
import { decodeEvents, EVENTS_KEY, loadEvents, recordEvents } from "./events";
import { eventKey } from "../stats/event";
import {
  HISTORY_KEY,
  isSessionRecord,
  loadHistory,
  memoryStore,
  saveHistory,
  SETTINGS_KEY,
  trimHistory,
} from "./history";
import { readJson, tryWriteJson, type KeyValueStore } from "./kv";
import { MIGRATED_KEY } from "./migrate";
import {
  loadTextResults,
  MAX_TEXT_RESULTS,
  TEXT_TYPING_KEY,
  TEXT_TYPING_SETTINGS_KEY,
} from "./text-typing";
import { loadTypingResults, MAX_TYPING_RESULTS, TYPING_KEY, TYPING_SETTINGS_KEY } from "./typing";
import {
  loadAllResults,
  MAX_VIM_RESULTS,
  VIM_EDIT_SETTINGS_KEY,
  VIM_KEY,
  VIM_SETTINGS_KEY,
} from "./vim";
import { loadUnlocked, parseUnlocked, saveUnlocked, VIM_LEARN_KEY } from "./vim-learn";

export type ImportResult =
  | { readonly ok: true; readonly added: number }
  | { readonly ok: false; readonly error: "invalid" | "app" | "version" };

const APP = "popis";
const VERSION = 1;

/** Per-key preferences: an import fills the ones that are not stored yet. */
const PREFERENCE_KEYS = [
  SETTINGS_KEY,
  VIM_SETTINGS_KEY,
  VIM_EDIT_SETTINGS_KEY,
  TYPING_SETTINGS_KEY,
  TEXT_TYPING_SETTINGS_KEY,
];

/** Every key that goes in a backup. */
const BACKUP_KEYS = [
  HISTORY_KEY,
  EVENTS_KEY,
  DAILY_KEY,
  VIM_KEY,
  TYPING_KEY,
  TEXT_TYPING_KEY,
  VIM_LEARN_KEY,
  ...PREFERENCE_KEYS,
];

/** `popis-YYYY-MM-DD.json`, by the UTC date of `now`. */
export function backupFileName(now: number): string {
  return `${APP}-${dayOf(now)}.json`;
}

/** Everything the app stores, as the text of a backup file. */
export function exportData(store: KeyValueStore, now: number): string {
  const data: Record<string, unknown> = {};
  for (const key of BACKUP_KEYS) {
    const value = readJson(store, key);
    if (value !== undefined) data[key] = value;
  }
  return JSON.stringify({ app: APP, version: VERSION, exportedAt: now, data });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

type Round = { readonly finishedAt: number; readonly seed: number; readonly kind?: string };

/** The old per-round result lists: how to read them and how many to keep. */
const RESULT_LISTS: readonly {
  readonly key: string;
  readonly load: (store: KeyValueStore) => readonly Round[];
  readonly max: number;
}[] = [
  { key: VIM_KEY, load: loadAllResults, max: MAX_VIM_RESULTS },
  { key: TYPING_KEY, load: loadTypingResults, max: MAX_TYPING_RESULTS },
  { key: TEXT_TYPING_KEY, load: loadTextResults, max: MAX_TEXT_RESULTS },
];

const roundId = (r: Round): string => `${r.kind ?? "motion"}|${String(r.finishedAt)}|${String(r.seed)}`;

/** Adds the results of `value` that the list does not have; returns how many. */
function mergeResults(store: KeyValueStore, list: (typeof RESULT_LISTS)[number], value: unknown): number {
  const own = list.load(store);
  const known = new Set(own.map(roundId));
  const fresh = list.load(memoryStore({ [list.key]: JSON.stringify(value) })).filter(
    (r) => !known.has(roundId(r)),
  );
  if (fresh.length === 0) return 0;
  const merged = [...own, ...fresh].sort((a, b) => a.finishedAt - b.finishedAt);
  tryWriteJson(store, list.key, merged.slice(-list.max));
  return fresh.length;
}

function mergeSessions(store: KeyValueStore, value: unknown): number {
  const id = (s: { finishedAt: number; mode: string; seed: number }): string =>
    `${String(s.finishedAt)}|${s.mode}|${String(s.seed)}`;
  const own = loadHistory(store);
  const known = new Set(own.map(id));
  const fresh = (Array.isArray(value) ? value.filter(isSessionRecord) : []).filter(
    (s) => !known.has(id(s)),
  );
  if (fresh.length === 0) return 0;
  const { keep, dropped } = trimHistory(
    [...own, ...fresh].sort((a, b) => a.finishedAt - b.finishedAt),
  );
  saveHistory(store, keep, dropped);
  return fresh.length;
}

function mergeEvents(store: KeyValueStore, value: unknown, now: number): number {
  const known = new Set(loadEvents(store).map(eventKey));
  const fresh = decodeEvents(value).filter((e) => !known.has(eventKey(e)));
  if (fresh.length > 0) recordEvents(store, fresh, now);
  return fresh.length;
}

const rowId = (r: DailyRow): string =>
  [r.day, r.drill, r.config, r.kc, r.n, r.ok, r.q1, r.median, r.q3].join("|");

function mergeRows(store: KeyValueStore, value: unknown): number {
  const own = loadDaily(store);
  const known = new Set(own.map(rowId));
  const fresh = unionDaily(own, parseDaily(value)).filter((r) => !known.has(rowId(r)));
  if (fresh.length > 0) saveDaily(store, unionDaily(own, parseDaily(value)));
  return fresh.length;
}

/** Merges a backup file into the store without duplicating anything. */
export function importData(store: KeyValueStore, text: string, now: number): ImportResult {
  let file: unknown;
  try {
    file = JSON.parse(text);
  } catch {
    return { ok: false, error: "invalid" };
  }
  if (!isRecord(file)) return { ok: false, error: "invalid" };
  if (file["app"] !== APP) return { ok: false, error: "app" };
  if (file["version"] !== VERSION) return { ok: false, error: "version" };
  const data = file["data"];
  if (!isRecord(data)) return { ok: false, error: "invalid" };

  let added = mergeSessions(store, data[HISTORY_KEY]);
  added += mergeEvents(store, data[EVENTS_KEY], now);
  added += mergeRows(store, data[DAILY_KEY]);
  for (const list of RESULT_LISTS) added += mergeResults(store, list, data[list.key]);
  for (const key of PREFERENCE_KEYS) {
    if (data[key] !== undefined && readJson(store, key) === undefined) {
      tryWriteJson(store, key, data[key]);
    }
  }
  const unlocked = parseUnlocked({ unlocked: [...loadUnlocked(store), ...parseUnlocked(data[VIM_LEARN_KEY])] });
  if (unlocked.length > 0) saveUnlocked(store, unlocked);
  if (readJson(store, MIGRATED_KEY) === undefined) tryWriteJson(store, MIGRATED_KEY, 1);
  return { ok: true, added };
}
