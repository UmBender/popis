import type { TextSettings } from "../typing/text";
import type { KeyValueStore } from "./history";

export const TEXT_TYPING_KEY = "popis.text-typing";
export const TEXT_TYPING_SETTINGS_KEY = "popis.text-typing-settings";
export const MAX_TEXT_RESULTS = 200;

export type TextChars = {
  readonly correct: number;
  readonly incorrect: number;
  readonly extra: number;
  readonly missed: number;
};

/** One finished text typing test (ADR-T12-1). */
export type TextResult = {
  readonly version: 1;
  /** `textConfigKey` of the settings. */
  readonly config: string;
  readonly seed: number;
  readonly wpm: number;
  readonly raw: number;
  readonly accuracy: number;
  readonly chars: TextChars;
  readonly timeMs: number;
  readonly finishedAt: number;
};

export type TextSummary = { readonly best: number; readonly recentMean: number } | null;

export function loadTextResults(store: KeyValueStore): TextResult[] {
  void store;
  throw new Error("todo");
}

export function appendTextResult(store: KeyValueStore, result: TextResult): void {
  void store;
  void result;
  throw new Error("todo");
}

export function loadTextSettings(store: KeyValueStore): TextSettings {
  void store;
  throw new Error("todo");
}

export function saveTextSettings(store: KeyValueStore, settings: TextSettings): void {
  void store;
  void settings;
  throw new Error("todo");
}

/** Best WPM and mean of the last 10 tests of `config`. */
export function textSummary(results: readonly TextResult[], config: string): TextSummary {
  void results;
  void config;
  throw new Error("todo");
}
