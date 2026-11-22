import type { Language } from "../typing/corpus";
import { DEFAULT_PACE_GOAL } from "../typing/pace";
import type { TextSettings } from "../typing/text";
import type { KeyValueStore } from "./kv";

export const TYPING_PACE_KEY = "popis.typing-pace";

/** Persisted typing target-pace settings and per-config target WPMs (ADR-T29-1). */
export type TypingPaceStore = {
  readonly version: 1;
  readonly enabled: boolean;
  readonly goal: number;
  readonly targets: Readonly<Record<string, number>>;
};

export const DEFAULT_TYPING_PACE: TypingPaceStore = {
  version: 1,
  enabled: true,
  goal: DEFAULT_PACE_GOAL,
  targets: {},
};

export function textPaceKey(_settings: TextSettings): string {
  throw new Error("todo");
}

export function codePaceKey(_languages: readonly Language[]): string {
  throw new Error("todo");
}

export function parseTypingPace(_value: unknown): TypingPaceStore {
  throw new Error("todo");
}

export function loadTypingPace(_store: KeyValueStore): TypingPaceStore {
  throw new Error("todo");
}

export function saveTypingPace(_store: KeyValueStore, _pace: TypingPaceStore): void {
  throw new Error("todo");
}

export function targetForConfig(
  _pace: TypingPaceStore,
  _key: string,
  _recentWpms: readonly number[],
): number {
  throw new Error("todo");
}

export function saveConfigTarget(
  _store: KeyValueStore,
  _key: string,
  _target: number,
): TypingPaceStore {
  throw new Error("todo");
}
