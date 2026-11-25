import type { StlLevel } from "../stl/drill";
import { STL_DURATIONS_S } from "../stl/round";
import { readJson, tryWriteJson, type KeyValueStore } from "./kv";

export const STL_KEY = "popis.stl";
export const STL_RESULTS_KEY = "popis.stl-results";
export const MAX_STL_RESULTS = 200;

export type StlSettings = {
  readonly durationS: number;
  readonly level: StlLevel;
};

export const DEFAULT_STL_SETTINGS: StlSettings = {
  durationS: 120,
  level: 1,
};

export type StlResult = {
  readonly version: 1;
  readonly durationS: number;
  readonly level: StlLevel;
  readonly seed: number;
  readonly correct: number;
  readonly wrong: number;
  readonly skipped: number;
  readonly finishedAt: number;
};

const isDuration = (value: unknown): value is number =>
  STL_DURATIONS_S.includes(value as (typeof STL_DURATIONS_S)[number]);

const isLevel = (value: unknown): value is StlLevel =>
  value === 1 || value === 2 || value === 3 || value === 4;

/** STL drill settings from parsed JSON; invalid fields fall back to defaults. */
export function parseStlSettings(value: unknown): StlSettings {
  const raw = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  return {
    durationS: isDuration(raw["durationS"]) ? raw["durationS"] : DEFAULT_STL_SETTINGS.durationS,
    level: isLevel(raw["level"]) ? raw["level"] : DEFAULT_STL_SETTINGS.level,
  };
}

export function loadStlSettings(store: KeyValueStore): StlSettings {
  return parseStlSettings(readJson(store, STL_KEY));
}

export function saveStlSettings(store: KeyValueStore, settings: StlSettings): void {
  tryWriteJson(store, STL_KEY, settings);
}

const RESULT_NUMBERS = ["durationS", "seed", "correct", "wrong", "skipped", "finishedAt"];

function isStlResult(value: unknown): value is StlResult {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    r["version"] === 1 &&
    isLevel(r["level"]) &&
    RESULT_NUMBERS.every((k) => typeof r[k] === "number" && Number.isFinite(r[k]))
  );
}

export function loadStlResults(store: KeyValueStore): StlResult[] {
  const value = readJson(store, STL_RESULTS_KEY);
  if (!Array.isArray(value)) return [];
  return value.filter(isStlResult);
}

export function appendStlResult(store: KeyValueStore, result: StlResult): void {
  const results = [...loadStlResults(store), result];
  tryWriteJson(store, STL_RESULTS_KEY, results.slice(-MAX_STL_RESULTS));
}
