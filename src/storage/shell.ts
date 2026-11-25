import { SHELL_DRILL_KINDS, type ShellDrillKind } from "../shell/drill";
import { SHELL_DURATIONS_S } from "../shell/round";
import { readJson, tryWriteJson, type KeyValueStore } from "./kv";

export const SHELL_KEY = "popis.shell";
export const SHELL_RESULTS_KEY = "popis.shell-results";
export const MAX_SHELL_RESULTS = 200;

export type ShellSettings = {
  readonly durationS: number;
  readonly kinds: readonly ShellDrillKind[];
};

export const DEFAULT_SHELL_SETTINGS: ShellSettings = {
  durationS: 60,
  kinds: SHELL_DRILL_KINDS,
};

export type ShellCmdResult = {
  readonly version: 1;
  readonly durationS: number;
  readonly seed: number;
  readonly correct: number;
  readonly wrong: number;
  readonly skipped: number;
  readonly finishedAt: number;
};

const isDuration = (value: unknown): value is number =>
  SHELL_DURATIONS_S.includes(value as (typeof SHELL_DURATIONS_S)[number]);

/** Shell Comandos settings from parsed JSON; invalid fields fall back to defaults. */
export function parseShellSettings(value: unknown): ShellSettings {
  const raw = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  const wanted = Array.isArray(raw["kinds"]) ? raw["kinds"] : [];
  const kinds = SHELL_DRILL_KINDS.filter((kind) => wanted.includes(kind));
  return {
    durationS: isDuration(raw["durationS"]) ? raw["durationS"] : DEFAULT_SHELL_SETTINGS.durationS,
    kinds: kinds.length > 0 ? kinds : SHELL_DRILL_KINDS,
  };
}

export function loadShellSettings(store: KeyValueStore): ShellSettings {
  return parseShellSettings(readJson(store, SHELL_KEY));
}

export function saveShellSettings(store: KeyValueStore, settings: ShellSettings): void {
  tryWriteJson(store, SHELL_KEY, settings);
}

const RESULT_NUMBERS = ["durationS", "seed", "correct", "wrong", "skipped", "finishedAt"];

function isShellCmdResult(value: unknown): value is ShellCmdResult {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    r["version"] === 1 &&
    RESULT_NUMBERS.every((k) => typeof r[k] === "number" && Number.isFinite(r[k]))
  );
}

export function loadShellResults(store: KeyValueStore): ShellCmdResult[] {
  const value = readJson(store, SHELL_RESULTS_KEY);
  if (!Array.isArray(value)) return [];
  return value.filter(isShellCmdResult);
}

export function appendShellResult(store: KeyValueStore, result: ShellCmdResult): void {
  const results = [...loadShellResults(store), result];
  tryWriteJson(store, SHELL_RESULTS_KEY, results.slice(-MAX_SHELL_RESULTS));
}
