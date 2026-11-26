import { ICPC_KINDS, type IcpcKindFilter } from "../icpc/drill";
import { ICPC_DURATIONS_S } from "../icpc/round";
import { readJson, tryWriteJson, type KeyValueStore } from "./kv";

export const ICPC_KEY = "popis.icpc";
export const ICPC_RESULTS_KEY = "popis.icpc-results";
export const MAX_ICPC_RESULTS = 200;

export type IcpcSettings = {
  readonly durationS: number;
  readonly kind: IcpcKindFilter;
  readonly compileErrorCounts: boolean;
};

export const DEFAULT_ICPC_SETTINGS: IcpcSettings = {
  durationS: 90,
  kind: "all",
  compileErrorCounts: false,
};

export type IcpcResult = {
  readonly version: 1;
  readonly durationS: number;
  readonly kind: IcpcKindFilter;
  readonly compileErrorCounts: boolean;
  readonly seed: number;
  readonly correct: number;
  readonly wrong: number;
  readonly skipped: number;
  readonly finishedAt: number;
};

const isDuration = (value: unknown): value is number =>
  ICPC_DURATIONS_S.includes(value as (typeof ICPC_DURATIONS_S)[number]);

const isKindFilter = (value: unknown): value is IcpcKindFilter =>
  value === "all" || ICPC_KINDS.includes(value as (typeof ICPC_KINDS)[number]);

/** ICPC scoreboard drill settings from parsed JSON; invalid fields fall back to defaults. */
export function parseIcpcSettings(value: unknown): IcpcSettings {
  const raw = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  return {
    durationS: isDuration(raw["durationS"]) ? raw["durationS"] : DEFAULT_ICPC_SETTINGS.durationS,
    kind: isKindFilter(raw["kind"]) ? raw["kind"] : DEFAULT_ICPC_SETTINGS.kind,
    compileErrorCounts:
      typeof raw["compileErrorCounts"] === "boolean"
        ? raw["compileErrorCounts"]
        : DEFAULT_ICPC_SETTINGS.compileErrorCounts,
  };
}

export function loadIcpcSettings(store: KeyValueStore): IcpcSettings {
  return parseIcpcSettings(readJson(store, ICPC_KEY));
}

export function saveIcpcSettings(store: KeyValueStore, settings: IcpcSettings): void {
  tryWriteJson(store, ICPC_KEY, settings);
}

const RESULT_NUMBERS = ["durationS", "seed", "correct", "wrong", "skipped", "finishedAt"];

function isIcpcResult(value: unknown): value is IcpcResult {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    r["version"] === 1 &&
    isKindFilter(r["kind"]) &&
    typeof r["compileErrorCounts"] === "boolean" &&
    RESULT_NUMBERS.every((k) => typeof r[k] === "number" && Number.isFinite(r[k]))
  );
}

export function loadIcpcResults(store: KeyValueStore): IcpcResult[] {
  const value = readJson(store, ICPC_RESULTS_KEY);
  if (!Array.isArray(value)) return [];
  return value.filter(isIcpcResult);
}

export function appendIcpcResult(store: KeyValueStore, result: IcpcResult): void {
  const results = [...loadIcpcResults(store), result];
  tryWriteJson(store, ICPC_RESULTS_KEY, results.slice(-MAX_ICPC_RESULTS));
}
