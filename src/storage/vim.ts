import type { Level } from "../vim/levels";
import type { KeyValueStore } from "./history";

export const VIM_KEY = "popis.vim";
export const VIM_SETTINGS_KEY = "popis.vim-settings";
export const MAX_VIM_RESULTS = 200;

export type VimSettings = { readonly level: Level; readonly durationS: number };

export const DEFAULT_VIM_SETTINGS: VimSettings = { level: 1, durationS: 60 };

/** One finished round (ADR-T13-1). */
export type VimResult = {
  readonly version: 1;
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

/** Settings from parsed JSON; an invalid field loads as its default. */
export function parseVimSettings(_value: unknown): VimSettings {
  throw new Error("todo");
}

export function loadVimSettings(_store: KeyValueStore): VimSettings {
  throw new Error("todo");
}

export function saveVimSettings(_store: KeyValueStore, _settings: VimSettings): void {
  throw new Error("todo");
}

export function loadVimResults(_store: KeyValueStore): VimResult[] {
  throw new Error("todo");
}

export function appendVimResult(_store: KeyValueStore, _result: VimResult): void {
  throw new Error("todo");
}

/** Best count of targets and mean of the last 10 rounds of a level and duration. */
export function vimSummary(
  _results: readonly VimResult[],
  _level: Level,
  _durationS: number,
): VimSummary {
  throw new Error("todo");
}
