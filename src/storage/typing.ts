import { LANGUAGES, type Language } from "../typing/corpus";
import type { KeyValueStore } from "./history";

export const TYPING_KEY = "popis.typing";
export const TYPING_SETTINGS_KEY = "popis.typing-settings";
export const MAX_TYPING_RESULTS = 200;

/** Runs averaged in the summary. */
const RECENT = 10;

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

export type TypingResultKind = "corpus" | "generated" | "burst";

/** Classifies a stored `snippetId` into legacy corpus, generated code or burst (T31 AC-4). */
export function typingResultKind(snippetId: string): TypingResultKind {
  if (snippetId.startsWith("burst:")) return "burst";
  if (snippetId.startsWith("gen:")) return "generated";
  return "corpus";
}

/** Parsed JSON at `key`, or undefined when missing, unreadable or corrupt. */
function readJson(store: KeyValueStore, key: string): unknown {
  try {
    const raw = store.getItem(key);
    return raw === null ? undefined : (JSON.parse(raw) as unknown);
  } catch {
    return undefined;
  }
}

/** Best effort: a full or blocked store must not break the screen. */
function writeJson(store: KeyValueStore, key: string, value: unknown): void {
  try {
    store.setItem(key, JSON.stringify(value));
  } catch {
    // Nothing to do; the run still shows its results.
  }
}

function isLanguage(value: unknown): value is Language {
  return LANGUAGES.includes(value as Language);
}

function isTypingResult(value: unknown): value is TypingResult {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Record<string, unknown>;
  const numbers = ["seed", "wpm", "accuracy", "errors", "timeMs", "finishedAt"];
  return (
    r["version"] === 1 &&
    typeof r["snippetId"] === "string" &&
    isLanguage(r["language"]) &&
    numbers.every((k) => typeof r[k] === "number" && Number.isFinite(r[k]))
  );
}

export function loadTypingResults(store: KeyValueStore): TypingResult[] {
  const value = readJson(store, TYPING_KEY);
  return Array.isArray(value) ? value.filter(isTypingResult) : [];
}

export function appendTypingResult(store: KeyValueStore, result: TypingResult): void {
  const results = [...loadTypingResults(store), result];
  writeJson(store, TYPING_KEY, results.slice(-MAX_TYPING_RESULTS));
}

/** The checked languages, or both when nothing valid is stored. */
export function loadTypingLanguages(store: KeyValueStore): Language[] {
  const value = readJson(store, TYPING_SETTINGS_KEY);
  if (!Array.isArray(value) || value.length === 0 || !value.every(isLanguage)) {
    return [...LANGUAGES];
  }
  return LANGUAGES.filter((l) => value.includes(l));
}

export function saveTypingLanguages(store: KeyValueStore, languages: readonly Language[]): void {
  writeJson(store, TYPING_SETTINGS_KEY, languages);
}

/** Best WPM and mean of the last 10 runs of each language. */
export function typingSummary(
  results: readonly TypingResult[],
): Readonly<Record<Language, LanguageSummary>> {
  const summary = (language: Language): LanguageSummary => {
    const wpms = results.filter((r) => r.language === language).map((r) => r.wpm);
    if (wpms.length === 0) return null;
    const recent = wpms.slice(-RECENT);
    return {
      best: Math.max(...wpms),
      recentMean: recent.reduce((a, b) => a + b, 0) / recent.length,
    };
  };
  return { cpp: summary("cpp"), python: summary("python") };
}
