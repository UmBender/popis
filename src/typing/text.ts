import type { ListSize, TextLanguage } from "./words";

/** Common words, or a quote. */
export type TextSource = "words" | "quote";
/** Words tests run against the clock or for a number of words. */
export type TextMode = "time" | "words";

export const TIME_OPTIONS = [15, 30, 60, 120] as const;
export type TimeOption = (typeof TIME_OPTIONS)[number];
export const WORD_COUNT_OPTIONS = [10, 25, 50, 100] as const;
export type WordCountOption = (typeof WORD_COUNT_OPTIONS)[number];

/** Options of the text typing test (T12). */
export type TextSettings = {
  readonly source: TextSource;
  readonly language: TextLanguage;
  readonly listSize: ListSize;
  readonly mode: TextMode;
  readonly seconds: TimeOption;
  readonly wordCount: WordCountOption;
  readonly punctuation: boolean;
  readonly numbers: boolean;
  /** `nao` counts as `não` (ADR-T12-1). */
  readonly lenientAccents: boolean;
};

export const DEFAULT_TEXT_SETTINGS: TextSettings = {
  source: "words",
  language: "pt",
  listSize: 200,
  mode: "time",
  seconds: 30,
  wordCount: 25,
  punctuation: false,
  numbers: false,
  lenientAccents: false,
};

/** Words a time test keeps generated ahead of the current one. */
export const TIME_LOOKAHEAD = 40;

/** Settings from untrusted JSON; each invalid field takes its default. */
export function parseTextSettings(value: unknown): TextSettings {
  void value;
  throw new Error("todo");
}

/** Word `index` of the words test seeded with `seed` (ADR-T12-1). */
export function wordAt(seed: number, settings: TextSettings, index: number): string {
  void seed;
  void settings;
  void index;
  throw new Error("todo");
}

/** Words `from` to `from + count − 1`. */
export function wordsFrom(
  seed: number,
  settings: TextSettings,
  from: number,
  count: number,
): string[] {
  void seed;
  void settings;
  void from;
  void count;
  throw new Error("todo");
}

/** The words a test starts with. */
export function initialWords(seed: number, settings: TextSettings): string[] {
  void seed;
  void settings;
  throw new Error("todo");
}

/** Length of a time test, or null when the test ends with its words. */
export function timeLimitMs(settings: TextSettings): number | null {
  void settings;
  throw new Error("todo");
}

/** Identifies the settings that change a test, for the summary. */
export function textConfigKey(settings: TextSettings): string {
  void settings;
  throw new Error("todo");
}

/** The settings that change a test, in words. */
export function textConfigLabel(settings: TextSettings): string {
  void settings;
  throw new Error("todo");
}
