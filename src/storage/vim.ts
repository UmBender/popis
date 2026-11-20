import { EDIT_KINDS, type EditKind } from "../vim/drills/edit";
import { LEVELS, type Level } from "../vim/levels";
import { ROUND_DURATIONS_S } from "../vim/round";
import type { KeyValueStore } from "./history";

export const VIM_KEY = "popis.vim";
export const VIM_SETTINGS_KEY = "popis.vim-settings";
export const MAX_VIM_RESULTS = 200;

/** Rounds averaged in the summary. */
const RECENT = 10;

export type VimSettings = { readonly level: Level; readonly durationS: number };

export const DEFAULT_VIM_SETTINGS: VimSettings = { level: 1, durationS: 60 };

/** One finished round (ADR-T13-1). */
export type VimResult = {
  readonly version: 1;
  /** Missing in results saved by T13; they load as "motion". */
  readonly kind?: "motion";
  readonly level: Level;
  readonly durationS: number;
  readonly seed: number;
  readonly reached: number;
  readonly skipped: number;
  /** Mean efficiency of the reached targets, 0 to 1. */
  readonly efficiency: number;
  readonly finishedAt: number;
};

export type VimSummary = { readonly best: number; readonly recentMean: number } | null;

export const VIM_EDIT_SETTINGS_KEY = "popis.vim-edit-settings";

/** Which drill the screen shows, and the options of the edit drill (ADR-T14-1). */
export type VimEditSettings = {
  readonly drill: "motion" | "edit";
  readonly durationS: number;
  readonly kinds: readonly EditKind[];
};

export const DEFAULT_VIM_EDIT_SETTINGS: VimEditSettings = {
  drill: "motion",
  durationS: 60,
  kinds: EDIT_KINDS,
};

/** One finished edit round, stored in `popis.vim` with `kind: "edit"`. */
export type VimEditResult = {
  readonly version: 1;
  readonly kind: "edit";
  readonly durationS: number;
  readonly seed: number;
  readonly reached: number;
  readonly skipped: number;
  /** Mean efficiency of the reached edits; above 1 beats the reference. */
  readonly efficiency: number;
  readonly finishedAt: number;
};

export function parseVimEditSettings(value: unknown): VimEditSettings {
  void value;
  throw new Error("todo");
}

export function loadVimEditSettings(store: KeyValueStore): VimEditSettings {
  void store;
  throw new Error("todo");
}

export function saveVimEditSettings(store: KeyValueStore, settings: VimEditSettings): void {
  void store;
  void settings;
  throw new Error("todo");
}

export function loadVimEditResults(store: KeyValueStore): VimEditResult[] {
  void store;
  throw new Error("todo");
}

export function appendVimEditResult(store: KeyValueStore, result: VimEditResult): void {
  void store;
  void result;
  throw new Error("todo");
}

/** Best count of edits and mean of the last 10 edit rounds of a duration. */
export function vimEditSummary(results: readonly VimEditResult[], durationS: number): VimSummary {
  void results;
  void durationS;
  throw new Error("todo");
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

/** Best effort: a full or blocked store must not break the screen. */
function writeJson(store: KeyValueStore, key: string, value: unknown): void {
  try {
    store.setItem(key, JSON.stringify(value));
  } catch {
    // Nothing to do; the round still shows its results.
  }
}

const isLevel = (value: unknown): value is Level => LEVELS.includes(value as Level);

const isDuration = (value: unknown): value is number =>
  ROUND_DURATIONS_S.includes(value as (typeof ROUND_DURATIONS_S)[number]);

/** Settings from parsed JSON; an invalid field loads as its default. */
export function parseVimSettings(value: unknown): VimSettings {
  const raw = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  return {
    level: isLevel(raw["level"]) ? raw["level"] : DEFAULT_VIM_SETTINGS.level,
    durationS: isDuration(raw["durationS"]) ? raw["durationS"] : DEFAULT_VIM_SETTINGS.durationS,
  };
}

export function loadVimSettings(store: KeyValueStore): VimSettings {
  return parseVimSettings(readJson(store, VIM_SETTINGS_KEY));
}

export function saveVimSettings(store: KeyValueStore, settings: VimSettings): void {
  writeJson(store, VIM_SETTINGS_KEY, settings);
}

function isVimResult(value: unknown): value is VimResult {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Record<string, unknown>;
  const numbers = ["durationS", "seed", "reached", "skipped", "efficiency", "finishedAt"];
  return (
    r["version"] === 1 &&
    isLevel(r["level"]) &&
    numbers.every((k) => typeof r[k] === "number" && Number.isFinite(r[k]))
  );
}

export function loadVimResults(store: KeyValueStore): VimResult[] {
  const value = readJson(store, VIM_KEY);
  return Array.isArray(value) ? value.filter(isVimResult) : [];
}

export function appendVimResult(store: KeyValueStore, result: VimResult): void {
  const results = [...loadVimResults(store), result];
  writeJson(store, VIM_KEY, results.slice(-MAX_VIM_RESULTS));
}

/** Best count of targets and mean of the last 10 rounds of a level and duration. */
export function vimSummary(
  results: readonly VimResult[],
  level: Level,
  durationS: number,
): VimSummary {
  const counts = results
    .filter((r) => r.level === level && r.durationS === durationS)
    .map((r) => r.reached);
  if (counts.length === 0) return null;
  const recent = counts.slice(-RECENT);
  return {
    best: Math.max(...counts),
    recentMean: recent.reduce((a, b) => a + b, 0) / recent.length,
  };
}
