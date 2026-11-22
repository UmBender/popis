import type { Language } from "../typing/corpus";
import {
  DEFAULT_PACE_GOAL,
  initialTargetWpm,
  MAX_PACE_GOAL,
  MIN_PACE_GOAL,
  MIN_TARGET_WPM,
} from "../typing/pace";
import { textConfigKey, type TextSettings } from "../typing/text";
import { readJson, tryWriteJson, type KeyValueStore } from "./kv";

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Stable pace key for a Texto configuration. */
export function textPaceKey(settings: TextSettings): string {
  return `text:${textConfigKey(settings)}`;
}

/** Stable pace key for the selected Código languages. */
export function codePaceKey(languages: readonly Language[]): string {
  return `code:${[...languages].sort().join("+")}`;
}

/** Parses untrusted JSON into a valid `TypingPaceStore`; corrupt data loads as empty history. */
export function parseTypingPace(value: unknown): TypingPaceStore {
  if (!isRecord(value) || value["version"] !== 1) return DEFAULT_TYPING_PACE;
  const enabled =
    typeof value["enabled"] === "boolean" ? value["enabled"] : DEFAULT_TYPING_PACE.enabled;
  const rawGoal = value["goal"];
  const goal =
    typeof rawGoal === "number" &&
    Number.isFinite(rawGoal) &&
    rawGoal >= MIN_PACE_GOAL &&
    rawGoal <= MAX_PACE_GOAL
      ? rawGoal
      : DEFAULT_PACE_GOAL;
  const targets: Record<string, number> = {};
  if (isRecord(value["targets"])) {
    for (const [key, val] of Object.entries(value["targets"])) {
      if (typeof val === "number" && Number.isFinite(val) && val >= MIN_TARGET_WPM) {
        targets[key] = val;
      }
    }
  }
  return { version: 1, enabled, goal, targets };
}

export function loadTypingPace(store: KeyValueStore): TypingPaceStore {
  return parseTypingPace(readJson(store, TYPING_PACE_KEY));
}

export function saveTypingPace(store: KeyValueStore, pace: TypingPaceStore): void {
  tryWriteJson(store, TYPING_PACE_KEY, pace);
}

/** Stored target for `key`, or the median of recent WPMs (30 WPM without history). */
export function targetForConfig(
  pace: TypingPaceStore,
  key: string,
  recentWpms: readonly number[],
): number {
  return pace.targets[key] ?? initialTargetWpm(recentWpms);
}

/** Updates and persists the target WPM for `key`, returning the updated store state. */
export function saveConfigTarget(
  store: KeyValueStore,
  key: string,
  target: number,
): TypingPaceStore {
  const current = loadTypingPace(store);
  const next: TypingPaceStore = {
    ...current,
    targets: { ...current.targets, [key]: target },
  };
  saveTypingPace(store, next);
  return next;
}
