import { DEFAULT_ARITHMETIC, type ArithmeticSettings } from "../gen/arithmetic";
import { DEFAULT_DURATION_S, type Attempt } from "../session/engine";

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
  readonly mode: "arithmetic";
  /** Wall-clock time the session ended, in epoch milliseconds. */
  readonly finishedAt: number;
  readonly durationMs: number;
  readonly seed: number;
  readonly params: ArithmeticSettings;
  readonly log: readonly Attempt[];
};

export type StoredSettings = {
  readonly arithmetic: ArithmeticSettings;
  readonly durationS: number;
};

export const DEFAULT_SETTINGS: StoredSettings = {
  arithmetic: DEFAULT_ARITHMETIC,
  durationS: DEFAULT_DURATION_S,
};

export function memoryStore(_initial: Record<string, string> = {}): KeyValueStore {
  throw new Error("todo");
}

/** `localStorage`, or memory when the browser blocks it. */
export function browserStore(): KeyValueStore {
  throw new Error("todo");
}

export function loadHistory(_store: KeyValueStore): SessionRecord[] {
  throw new Error("todo");
}

export function appendSession(_store: KeyValueStore, _record: SessionRecord): void {
  throw new Error("todo");
}

export function loadSettings(_store: KeyValueStore): StoredSettings {
  throw new Error("todo");
}

export function saveSettings(_store: KeyValueStore, _settings: StoredSettings): void {
  throw new Error("todo");
}
