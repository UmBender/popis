import { COMPILE_GROUPS, type CompileGroup } from "../compile/causes";
import { COMPILE_DURATIONS_S } from "../compile/round";
import { readJson, tryWriteJson, type KeyValueStore } from "./kv";

export const COMPILE_KEY = "popis.compile";
export const COMPILE_RESULTS_KEY = "popis.compile-results";
export const MAX_COMPILE_RESULTS = 200;

export type CompileSettings = {
  readonly durationS: number;
  readonly groups: readonly CompileGroup[];
};

export const DEFAULT_COMPILE_SETTINGS: CompileSettings = {
  durationS: 90,
  groups: COMPILE_GROUPS,
};

export type CompileRoundResult = {
  readonly version: 1;
  readonly durationS: number;
  readonly seed: number;
  readonly correct: number;
  readonly wrong: number;
  readonly skipped: number;
  readonly finishedAt: number;
};

const isDuration = (value: unknown): value is number =>
  COMPILE_DURATIONS_S.includes(value as (typeof COMPILE_DURATIONS_S)[number]);

/** Compiler output drill settings from parsed JSON; invalid fields fall back to defaults. */
export function parseCompileSettings(value: unknown): CompileSettings {
  const raw = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  const wanted = Array.isArray(raw["groups"]) ? raw["groups"] : [];
  const groups = COMPILE_GROUPS.filter((group) => wanted.includes(group));
  return {
    durationS: isDuration(raw["durationS"]) ? raw["durationS"] : DEFAULT_COMPILE_SETTINGS.durationS,
    groups: groups.length > 0 ? groups : COMPILE_GROUPS,
  };
}

export function loadCompileSettings(store: KeyValueStore): CompileSettings {
  return parseCompileSettings(readJson(store, COMPILE_KEY));
}

export function saveCompileSettings(store: KeyValueStore, settings: CompileSettings): void {
  tryWriteJson(store, COMPILE_KEY, settings);
}

const RESULT_NUMBERS = ["durationS", "seed", "correct", "wrong", "skipped", "finishedAt"];

function isCompileRoundResult(value: unknown): value is CompileRoundResult {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    r["version"] === 1 &&
    RESULT_NUMBERS.every((k) => typeof r[k] === "number" && Number.isFinite(r[k]))
  );
}

export function loadCompileResults(store: KeyValueStore): CompileRoundResult[] {
  const value = readJson(store, COMPILE_RESULTS_KEY);
  if (!Array.isArray(value)) return [];
  return value.filter(isCompileRoundResult);
}

export function appendCompileResult(store: KeyValueStore, result: CompileRoundResult): void {
  const results = [...loadCompileResults(store), result];
  tryWriteJson(store, COMPILE_RESULTS_KEY, results.slice(-MAX_COMPILE_RESULTS));
}
