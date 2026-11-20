import type { JsonValue } from "../core/problem";
import { isMode, MODE_IDS, MODES, type Mode, type ModeSettings } from "../modes";
import { DEFAULT_DURATION_S, DURATIONS_S, type Attempt } from "../session/engine";
import { sessionEvents } from "../stats/derive";
import { summarize } from "../stats/summary";
import { addDaily, noteQuota } from "./daily";
import { readJson, tryWriteJson, type KeyValueStore } from "./kv";

export type { Mode } from "../modes";
export type { KeyValueStore } from "./kv";

export const HISTORY_KEY = "popis.history.v1";
export const SETTINGS_KEY = "popis.settings.v1";
export const MAX_SESSIONS = 200;
/** Most characters the stored sessions may take (ADR-T22-1). */
export const HISTORY_BUDGET = 1_200_000;

export type SessionRecord = {
  readonly version: 1;
  readonly mode: Mode;
  /** Wall-clock time the session ended, in epoch milliseconds. */
  readonly finishedAt: number;
  readonly durationMs: number;
  readonly seed: number;
  /** Generator params of the session's mode. */
  readonly params: JsonValue;
  readonly log: readonly Attempt[];
};

/** The chosen mode and duration, plus the settings of every mode. */
export type StoredSettings = {
  readonly mode: Mode;
  readonly durationS: number;
} & { readonly [M in Mode]: ModeSettings[M] };

export const DEFAULT_SETTINGS: StoredSettings = {
  mode: "arithmetic",
  durationS: DEFAULT_DURATION_S,
  arithmetic: MODES.arithmetic.defaults,
  factoring: MODES.factoring.defaults,
  division: MODES.division.defaults,
  algebra: MODES.algebra.defaults,
  estimation: MODES.estimation.defaults,
  sums: MODES.sums.defaults,
  primes: MODES.primes.defaults,
  review: MODES.review.defaults,
};

export function memoryStore(initial: Record<string, string> = {}): KeyValueStore {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}

/** `localStorage`, or memory when the browser blocks it. */
export function browserStore(): KeyValueStore {
  try {
    const storage = window.localStorage;
    storage.getItem(SETTINGS_KEY);
    return storage;
  } catch {
    return memoryStore();
  }
}

/** Best effort: a full or blocked store must not break a game. */
function writeJson(store: KeyValueStore, key: string, value: unknown): void {
  tryWriteJson(store, key, value);
}

export function isSessionRecord(value: unknown): value is SessionRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { version?: unknown }).version === 1 &&
    Array.isArray((value as { log?: unknown }).log)
  );
}

export function loadHistory(store: KeyValueStore): SessionRecord[] {
  const value = readJson(store, HISTORY_KEY);
  return Array.isArray(value) ? value.filter(isSessionRecord) : [];
}

export type TrimmedHistory = {
  readonly keep: SessionRecord[];
  readonly dropped: SessionRecord[];
};

/**
 * The newest sessions that fit the limit of sessions and the size budget
 * (at least the newest one); the older ones are `dropped`.
 */
export function trimHistory(sessions: readonly SessionRecord[]): TrimmedHistory {
  const sizes = sessions.map((s) => JSON.stringify(s).length);
  let total = sizes.reduce((sum, size) => sum + size + 1, 1);
  let from = Math.max(0, sessions.length - MAX_SESSIONS);
  for (let i = 0; i < from; i++) total -= (sizes[i] as number) + 1;
  while (from < sessions.length - 1 && total > HISTORY_BUDGET) {
    total -= (sizes[from] as number) + 1;
    from++;
  }
  return { keep: sessions.slice(from), dropped: sessions.slice(0, from) };
}

/**
 * Stores `kept`. When the store refuses it, the oldest sessions are dropped
 * until it fits. Dropped sessions become daily rows, and a refusal leaves a
 * notice for the player.
 */
export function saveHistory(
  store: KeyValueStore,
  kept: readonly SessionRecord[],
  dropped: readonly SessionRecord[],
): void {
  let keep = kept;
  let spill = dropped;
  let refused = false;
  while (!tryWriteJson(store, HISTORY_KEY, keep)) {
    refused = true;
    if (keep.length <= 1) {
      noteQuota(store);
      return;
    }
    spill = [...spill, keep[0] as SessionRecord];
    keep = keep.slice(1);
  }
  if (spill.length > 0) addDaily(store, summarize(spill.flatMap(sessionEvents)));
  if (refused) noteQuota(store);
}

export function appendSession(store: KeyValueStore, record: SessionRecord): void {
  const { keep, dropped } = trimHistory([...loadHistory(store), record]);
  saveHistory(store, keep, dropped);
}

/**
 * Stored settings, or the defaults when anything stored is invalid. A mode
 * missing from what was stored (saved before that mode existed) takes its
 * registry defaults.
 */
export function loadSettings(store: KeyValueStore): StoredSettings {
  const value = readJson(store, SETTINGS_KEY);
  if (typeof value !== "object" || value === null) return DEFAULT_SETTINGS;
  const stored = value as Record<string, unknown>;
  const mode = stored["mode"] ?? DEFAULT_SETTINGS.mode;
  const durationS = stored["durationS"];
  if (!isMode(mode) || typeof durationS !== "number" || !DURATIONS_S.includes(durationS)) {
    return DEFAULT_SETTINGS;
  }
  const settings: Record<string, unknown> = { mode, durationS };
  for (const id of MODE_IDS) {
    const raw = stored[id];
    const parsed = raw === undefined ? MODES[id].defaults : MODES[id].parseSettings(raw);
    if (parsed === null) return DEFAULT_SETTINGS;
    settings[id] = parsed;
  }
  return settings as StoredSettings;
}

export function saveSettings(store: KeyValueStore, settings: StoredSettings): void {
  writeJson(store, SETTINGS_KEY, settings);
}
