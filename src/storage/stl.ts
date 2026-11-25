import type { StlLevel } from "../stl/drill";
import type { KeyValueStore } from "./kv";

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

export function parseStlSettings(_value: unknown): StlSettings {
  throw new Error("todo");
}

export function loadStlSettings(_store: KeyValueStore): StlSettings {
  throw new Error("todo");
}

export function saveStlSettings(_store: KeyValueStore, _settings: StlSettings): void {
  throw new Error("todo");
}

export function loadStlResults(_store: KeyValueStore): StlResult[] {
  throw new Error("todo");
}

export function appendStlResult(_store: KeyValueStore, _result: StlResult): void {
  throw new Error("todo");
}
