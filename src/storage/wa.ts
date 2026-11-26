import { WA_CLASSES, type WaClass } from "../wa/classes";
import { readJson, tryWriteJson, type KeyValueStore } from "./kv";

export const WA_KEY = "popis.wa";
export const WA_RESULTS_KEY = "popis.wa-results";
export const MAX_WA_RESULTS = 200;

export type WaSettings = {
  readonly classes: readonly WaClass[];
};

export const DEFAULT_WA_SETTINGS: WaSettings = {
  classes: WA_CLASSES,
};

export type WaRoundResult = {
  readonly version: 1;
  readonly seed: number;
  readonly count: number;
  readonly correct: number;
  readonly wrong: number;
  readonly skipped: number;
  readonly elapsedMs: number;
  readonly finishedAt: number;
};

/** WA hunt drill settings from parsed JSON; invalid fields fall back to defaults. */
export function parseWaSettings(value: unknown): WaSettings {
  const raw = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  const wanted = Array.isArray(raw["classes"]) ? raw["classes"] : [];
  const classes = WA_CLASSES.filter((bugClass) => wanted.includes(bugClass));
  return {
    classes: classes.length > 0 ? classes : WA_CLASSES,
  };
}

export function loadWaSettings(store: KeyValueStore): WaSettings {
  return parseWaSettings(readJson(store, WA_KEY));
}

export function saveWaSettings(store: KeyValueStore, settings: WaSettings): void {
  tryWriteJson(store, WA_KEY, settings);
}

const RESULT_NUMBERS = ["seed", "count", "correct", "wrong", "skipped", "elapsedMs", "finishedAt"];

function isWaRoundResult(value: unknown): value is WaRoundResult {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    r["version"] === 1 &&
    RESULT_NUMBERS.every((k) => typeof r[k] === "number" && Number.isFinite(r[k]))
  );
}

export function loadWaResults(store: KeyValueStore): WaRoundResult[] {
  const value = readJson(store, WA_RESULTS_KEY);
  if (!Array.isArray(value)) return [];
  return value.filter(isWaRoundResult);
}

export function appendWaResult(store: KeyValueStore, result: WaRoundResult): void {
  const results = [...loadWaResults(store), result];
  tryWriteJson(store, WA_RESULTS_KEY, results.slice(-MAX_WA_RESULTS));
}
