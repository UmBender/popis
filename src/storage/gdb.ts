import { GDB_CMD_KINDS, type GdbCmdKind } from "../gdb/cmd-drill";
import type { KeyValueStore } from "./history";

export const GDB_KEY = "popis.gdb";
export const GDB_RESULTS_KEY = "popis.gdb-results";
export const MAX_GDB_RESULTS = 200;

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

export function parseGdbSettings(_value: unknown): GdbSettings {
  throw new Error("todo");
}

export function loadGdbSettings(_store: KeyValueStore): GdbSettings {
  throw new Error("todo");
}

export function saveGdbSettings(_store: KeyValueStore, _settings: GdbSettings): void {
  throw new Error("todo");
}

export function loadGdbResults(_store: KeyValueStore): GdbCmdResult[] {
  throw new Error("todo");
}

export function appendGdbResult(_store: KeyValueStore, _result: GdbCmdResult): void {
  throw new Error("todo");
}
