import type { IcpcKindFilter } from "../icpc/drill";
import type { KeyValueStore } from "./kv";

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

export function parseIcpcSettings(_value: unknown): IcpcSettings {
  throw new Error("todo");
}

export function loadIcpcSettings(_store: KeyValueStore): IcpcSettings {
  throw new Error("todo");
}

export function saveIcpcSettings(_store: KeyValueStore, _settings: IcpcSettings): void {
  throw new Error("todo");
}

export function loadIcpcResults(_store: KeyValueStore): IcpcResult[] {
  throw new Error("todo");
}

export function appendIcpcResult(_store: KeyValueStore, _result: IcpcResult): void {
  throw new Error("todo");
}
