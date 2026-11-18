import {
  DEFAULT_ARITHMETIC,
  parseArithmeticSettings,
  type ArithmeticSettings,
} from "../gen/arithmetic";
import type { JsonValue } from "../core/problem";
import { DEFAULT_FACTORING, type FactoringSettings } from "../gen/factoring";
import { DEFAULT_DURATION_S, DURATIONS_S, type Attempt } from "../session/engine";

export type Mode = "arithmetic" | "factoring";

/** The part of `Storage` the app uses; injected so tests use memory. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const HISTORY_KEY = "popis.history.v1";
export const SETTINGS_KEY = "popis.settings.v1";
export const MAX_SESSIONS = 200;

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

export type StoredSettings = {
  readonly mode: Mode;
  readonly arithmetic: ArithmeticSettings;
  readonly factoring: FactoringSettings;
  readonly durationS: number;
};

export const DEFAULT_SETTINGS: StoredSettings = {
  mode: "arithmetic",
  arithmetic: DEFAULT_ARITHMETIC,
  factoring: DEFAULT_FACTORING,
  durationS: DEFAULT_DURATION_S,
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

/** Parsed JSON at `key`, or undefined when missing, unreadable or corrupt. */
function readJson(store: KeyValueStore, key: string): unknown {
  try {
    const raw = store.getItem(key);
    return raw === null ? undefined : (JSON.parse(raw) as unknown);
  } catch {
    return undefined;
  }
}

/** Best effort: a full or blocked store must not break a game. */
function writeJson(store: KeyValueStore, key: string, value: unknown): void {
  try {
    store.setItem(key, JSON.stringify(value));
  } catch {
    // Nothing to do; the session still shows its results.
  }
}

function isSessionRecord(value: unknown): value is SessionRecord {
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

export function appendSession(store: KeyValueStore, record: SessionRecord): void {
  const history = [...loadHistory(store), record];
  writeJson(store, HISTORY_KEY, history.slice(-MAX_SESSIONS));
}

export function loadSettings(store: KeyValueStore): StoredSettings {
  const value = readJson(store, SETTINGS_KEY);
  if (typeof value !== "object" || value === null) return DEFAULT_SETTINGS;
  const { arithmetic, durationS } = value as { arithmetic?: unknown; durationS?: unknown };
  const parsed = parseArithmeticSettings(arithmetic);
  if (parsed === null || typeof durationS !== "number" || !DURATIONS_S.includes(durationS)) {
    return DEFAULT_SETTINGS;
  }
  return { ...DEFAULT_SETTINGS, arithmetic: parsed, durationS };
}

export function saveSettings(store: KeyValueStore, settings: StoredSettings): void {
  writeJson(store, SETTINGS_KEY, settings);
}
