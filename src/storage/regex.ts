import { REGEX_DIALECTS, type RegexDialect } from "../regex/compile";
import { REGEX_ITEM_KINDS, type RegexItemKind } from "../regex/types";
import { readJson, tryWriteJson, type KeyValueStore } from "./kv";

export const REGEX_KEY = "popis.regex";
export const REGEX_RESULTS_KEY = "popis.regex-results";
export const MAX_REGEX_RESULTS = 200;

export type RegexSettings = {
  readonly dialect: RegexDialect;
  readonly kinds: readonly RegexItemKind[];
};

export const DEFAULT_REGEX_SETTINGS: RegexSettings = {
  dialect: "python",
  kinds: REGEX_ITEM_KINDS,
};

export type RegexRoundResult = {
  readonly version: 1;
  readonly dialect: RegexDialect;
  readonly seed: number;
  readonly correct: number;
  readonly skipped: number;
  readonly attempts: number;
  readonly timeMs: number;
  readonly finishedAt: number;
};

const isDialect = (value: unknown): value is RegexDialect =>
  REGEX_DIALECTS.includes(value as RegexDialect);

/** Regex Prática settings from parsed JSON; invalid fields fall back to defaults. */
export function parseRegexSettings(value: unknown): RegexSettings {
  const raw = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  const wanted = Array.isArray(raw["kinds"]) ? raw["kinds"] : [];
  const kinds = REGEX_ITEM_KINDS.filter((kind) => wanted.includes(kind));
  return {
    dialect: isDialect(raw["dialect"]) ? raw["dialect"] : DEFAULT_REGEX_SETTINGS.dialect,
    kinds: kinds.length > 0 ? kinds : REGEX_ITEM_KINDS,
  };
}

export function loadRegexSettings(store: KeyValueStore): RegexSettings {
  return parseRegexSettings(readJson(store, REGEX_KEY));
}

export function saveRegexSettings(store: KeyValueStore, settings: RegexSettings): void {
  tryWriteJson(store, REGEX_KEY, settings);
}

const RESULT_NUMBERS = ["seed", "correct", "skipped", "attempts", "timeMs", "finishedAt"] as const;

function isRegexRoundResult(value: unknown): value is RegexRoundResult {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    r["version"] === 1 &&
    isDialect(r["dialect"]) &&
    RESULT_NUMBERS.every((k) => typeof r[k] === "number" && Number.isFinite(r[k]))
  );
}

export function loadRegexResults(store: KeyValueStore): RegexRoundResult[] {
  const value = readJson(store, REGEX_RESULTS_KEY);
  if (!Array.isArray(value)) return [];
  return value.filter(isRegexRoundResult);
}

export function appendRegexResult(store: KeyValueStore, result: RegexRoundResult): void {
  const results = [...loadRegexResults(store), result];
  tryWriteJson(store, REGEX_RESULTS_KEY, results.slice(-MAX_REGEX_RESULTS));
}
