import type { Language } from "../typing/corpus";
import type { KeyValueStore } from "./history";

export const TYPING_KEY = "popis.typing";
export const TYPING_SETTINGS_KEY = "popis.typing-settings";
export const MAX_TYPING_RESULTS = 200;

/** One finished typing run (ADR-T10-1). */
export type TypingResult = {
  readonly version: 1;
  readonly snippetId: string;
  readonly language: Language;
  readonly seed: number;
  readonly wpm: number;
  readonly accuracy: number;
  readonly errors: number;
  readonly timeMs: number;
  readonly finishedAt: number;
};

export type LanguageSummary = { readonly best: number; readonly recentMean: number } | null;

export function loadTypingResults(store: KeyValueStore): TypingResult[] {
  void store;
  throw new Error("todo");
}

export function appendTypingResult(store: KeyValueStore, result: TypingResult): void {
  void store;
  void result;
  throw new Error("todo");
}

export function loadTypingLanguages(store: KeyValueStore): Language[] {
  void store;
  throw new Error("todo");
}

export function saveTypingLanguages(store: KeyValueStore, languages: readonly Language[]): void {
  void store;
  void languages;
  throw new Error("todo");
}

/** Best WPM and mean of the last 10 runs of each language. */
export function typingSummary(
  results: readonly TypingResult[],
): Readonly<Record<Language, LanguageSummary>> {
  void results;
  throw new Error("todo");
}
