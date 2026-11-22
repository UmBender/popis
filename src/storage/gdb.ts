import { GDB_CMD_KINDS, type GdbCmdKind } from "../gdb/cmd-drill";
import { GDB_OUT_KINDS, type GdbOutKind, type GdbOutLevel } from "../gdb/out-drill";
import { GDB_DURATIONS_S } from "../gdb/round";
import { readJson, tryWriteJson, type KeyValueStore } from "./kv";

export const GDB_KEY = "popis.gdb";
export const GDB_RESULTS_KEY = "popis.gdb-results";
export const GDB_OUT_KEY = "popis.gdb-output";
export const GDB_OUT_RESULTS_KEY = "popis.gdb-output-results";
export const MAX_GDB_RESULTS = 200;

export type GdbOutSettings = {
  readonly durationS: number;
  readonly level: GdbOutLevel;
  readonly kinds: readonly GdbOutKind[];
};

export const DEFAULT_GDB_OUT_SETTINGS: GdbOutSettings = {
  durationS: 60,
  level: 1,
  kinds: GDB_OUT_KINDS,
};

export type GdbOutResult = {
  readonly version: 1;
  readonly durationS: number;
  readonly level: GdbOutLevel;
  readonly seed: number;
  readonly correct: number;
  readonly wrong: number;
  readonly skipped: number;
  readonly finishedAt: number;
};

export type GdbSettings = {
  readonly durationS: number;
  readonly kinds: readonly GdbCmdKind[];
};

export const DEFAULT_GDB_SETTINGS: GdbSettings = {
  durationS: 60,
  kinds: GDB_CMD_KINDS,
};

export type GdbCmdResult = {
  readonly version: 1;
  readonly durationS: number;
  readonly seed: number;
  readonly correct: number;
  readonly wrong: number;
  readonly skipped: number;
  readonly finishedAt: number;
};

const isDuration = (value: unknown): value is number =>
  GDB_DURATIONS_S.includes(value as (typeof GDB_DURATIONS_S)[number]);

/** GDB Comandos settings from parsed JSON; invalid fields fall back to defaults. */
export function parseGdbSettings(value: unknown): GdbSettings {
  const raw = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  const wanted = Array.isArray(raw["kinds"]) ? raw["kinds"] : [];
  const kinds = GDB_CMD_KINDS.filter((kind) => wanted.includes(kind));
  return {
    durationS: isDuration(raw["durationS"]) ? raw["durationS"] : DEFAULT_GDB_SETTINGS.durationS,
    kinds: kinds.length > 0 ? kinds : GDB_CMD_KINDS,
  };
}

export function loadGdbSettings(store: KeyValueStore): GdbSettings {
  return parseGdbSettings(readJson(store, GDB_KEY));
}

export function saveGdbSettings(store: KeyValueStore, settings: GdbSettings): void {
  tryWriteJson(store, GDB_KEY, settings);
}

const RESULT_NUMBERS = ["durationS", "seed", "correct", "wrong", "skipped", "finishedAt"];

function isGdbCmdResult(value: unknown): value is GdbCmdResult {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    r["version"] === 1 &&
    RESULT_NUMBERS.every((k) => typeof r[k] === "number" && Number.isFinite(r[k]))
  );
}

export function loadGdbResults(store: KeyValueStore): GdbCmdResult[] {
  const value = readJson(store, GDB_RESULTS_KEY);
  if (!Array.isArray(value)) return [];
  return value.filter(isGdbCmdResult);
}

export function appendGdbResult(store: KeyValueStore, result: GdbCmdResult): void {
  const results = [...loadGdbResults(store), result];
  tryWriteJson(store, GDB_RESULTS_KEY, results.slice(-MAX_GDB_RESULTS));
}

const isLevel = (value: unknown): value is GdbOutLevel => value === 1 || value === 2 || value === 3;

/** GDB Saída settings from parsed JSON; invalid fields fall back to defaults. */
export function parseGdbOutSettings(value: unknown): GdbOutSettings {
  const raw = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  const wanted = Array.isArray(raw["kinds"]) ? raw["kinds"] : [];
  const kinds = GDB_OUT_KINDS.filter((kind) => wanted.includes(kind));
  return {
    durationS: isDuration(raw["durationS"]) ? raw["durationS"] : DEFAULT_GDB_OUT_SETTINGS.durationS,
    level: isLevel(raw["level"]) ? raw["level"] : DEFAULT_GDB_OUT_SETTINGS.level,
    kinds: kinds.length > 0 ? kinds : GDB_OUT_KINDS,
  };
}

export function loadGdbOutSettings(store: KeyValueStore): GdbOutSettings {
  return parseGdbOutSettings(readJson(store, GDB_OUT_KEY));
}

export function saveGdbOutSettings(store: KeyValueStore, settings: GdbOutSettings): void {
  tryWriteJson(store, GDB_OUT_KEY, settings);
}

function isGdbOutResult(value: unknown): value is GdbOutResult {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    r["version"] === 1 &&
    isLevel(r["level"]) &&
    RESULT_NUMBERS.every((k) => typeof r[k] === "number" && Number.isFinite(r[k]))
  );
}

export function loadGdbOutResults(store: KeyValueStore): GdbOutResult[] {
  const value = readJson(store, GDB_OUT_RESULTS_KEY);
  if (!Array.isArray(value)) return [];
  return value.filter(isGdbOutResult);
}

export function appendGdbOutResult(store: KeyValueStore, result: GdbOutResult): void {
  const results = [...loadGdbOutResults(store), result];
  tryWriteJson(store, GDB_OUT_RESULTS_KEY, results.slice(-MAX_GDB_RESULTS));
}
