import { WA_CLASSES, type WaClass } from "../wa/classes";
import type { KeyValueStore } from "./kv";

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

export function parseWaSettings(_value: unknown): WaSettings {
  throw new Error("todo");
}

export function loadWaSettings(_store: KeyValueStore): WaSettings {
  throw new Error("todo");
}

export function saveWaSettings(_store: KeyValueStore, _settings: WaSettings): void {
  throw new Error("todo");
}

export function loadWaResults(_store: KeyValueStore): WaRoundResult[] {
  throw new Error("todo");
}

export function appendWaResult(_store: KeyValueStore, _result: WaRoundResult): void {
  throw new Error("todo");
}
