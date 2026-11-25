import { COMPILE_GROUPS, type CompileGroup } from "../compile/causes";
import type { KeyValueStore } from "./kv";

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

export function parseCompileSettings(_value: unknown): CompileSettings {
  throw new Error("todo");
}

export function loadCompileSettings(_store: KeyValueStore): CompileSettings {
  throw new Error("todo");
}

export function saveCompileSettings(_store: KeyValueStore, _settings: CompileSettings): void {
  throw new Error("todo");
}

export function loadCompileResults(_store: KeyValueStore): CompileRoundResult[] {
  throw new Error("todo");
}

export function appendCompileResult(_store: KeyValueStore, _result: CompileRoundResult): void {
  throw new Error("todo");
}
