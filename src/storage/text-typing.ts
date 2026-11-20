import { parseTextSettings, type TextSettings } from "../typing/text";
import type { KeyValueStore } from "./history";

export const TEXT_TYPING_KEY = "popis.text-typing";
export const TEXT_TYPING_SETTINGS_KEY = "popis.text-typing-settings";
export const MAX_TEXT_RESULTS = 200;

/** Tests averaged in the summary. */
const RECENT = 10;

export type TextChars = {
  readonly correct: number;
  readonly incorrect: number;
  readonly extra: number;
  readonly missed: number;
};

/** One finished text typing test (ADR-T12-1). */
export type TextResult = {
  readonly version: 1;
  /** `textConfigKey` of the settings. */
  readonly config: string;
  readonly seed: number;
  readonly wpm: number;
  readonly raw: number;
  readonly accuracy: number;
  readonly chars: TextChars;
  readonly timeMs: number;
  readonly finishedAt: number;
};

export type TextSummary = { readonly best: number; readonly recentMean: number } | null;

/** Parsed JSON at `key`, or undefined when missing, unreadable or corrupt. */
function readJson(store: KeyValueStore, key: string): unknown {
  try {
    const raw = store.getItem(key);
    return raw === null ? undefined : (JSON.parse(raw) as unknown);
  } catch {
    return undefined;
  }
}

/** Best effort: a full or blocked store must not break the screen. */
function writeJson(store: KeyValueStore, key: string, value: unknown): void {
  try {
    store.setItem(key, JSON.stringify(value));
  } catch {
    // Nothing to do; the test still shows its results.
  }
}

function finiteNumbers(value: unknown, keys: readonly string[]): boolean {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Record<string, unknown>;
  return keys.every((k) => typeof r[k] === "number" && Number.isFinite(r[k]));
}

function isTextResult(value: unknown): value is TextResult {
  const numbers = ["seed", "wpm", "raw", "accuracy", "timeMs", "finishedAt"];
  if (!finiteNumbers(value, numbers)) return false;
  const r = value as Record<string, unknown>;
  return (
    r["version"] === 1 &&
    typeof r["config"] === "string" &&
    finiteNumbers(r["chars"], ["correct", "incorrect", "extra", "missed"])
  );
}

export function loadTextResults(store: KeyValueStore): TextResult[] {
  const value = readJson(store, TEXT_TYPING_KEY);
  return Array.isArray(value) ? value.filter(isTextResult) : [];
}

export function appendTextResult(store: KeyValueStore, result: TextResult): void {
  const results = [...loadTextResults(store), result];
  writeJson(store, TEXT_TYPING_KEY, results.slice(-MAX_TEXT_RESULTS));
}

/** The stored options; corrupt or missing ones load as the defaults. */
export function loadTextSettings(store: KeyValueStore): TextSettings {
  return parseTextSettings(readJson(store, TEXT_TYPING_SETTINGS_KEY));
}

export function saveTextSettings(store: KeyValueStore, settings: TextSettings): void {
  writeJson(store, TEXT_TYPING_SETTINGS_KEY, settings);
}

/** Best WPM and mean of the last 10 tests of `config`. */
export function textSummary(results: readonly TextResult[], config: string): TextSummary {
  const wpms = results.filter((r) => r.config === config).map((r) => r.wpm);
  if (wpms.length === 0) return null;
  const recent = wpms.slice(-RECENT);
  return {
    best: Math.max(...wpms),
    recentMean: recent.reduce((a, b) => a + b, 0) / recent.length,
  };
}
