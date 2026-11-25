import { SHELL_DRILL_KINDS, type ShellDrillKind } from "../shell/drill";
import type { KeyValueStore } from "./kv";

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

export function parseShellSettings(_value: unknown): ShellSettings {
  throw new Error("todo");
}

export function loadShellSettings(_store: KeyValueStore): ShellSettings {
  throw new Error("todo");
}

export function saveShellSettings(_store: KeyValueStore, _settings: ShellSettings): void {
  throw new Error("todo");
}

export function loadShellResults(_store: KeyValueStore): ShellCmdResult[] {
  throw new Error("todo");
}

export function appendShellResult(_store: KeyValueStore, _result: ShellCmdResult): void {
  throw new Error("todo");
}
