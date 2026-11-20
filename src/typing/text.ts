import { createRng, deriveSeed } from "../core/rng";
import { pickQuote } from "./quotes";
import {
  LIST_SIZES,
  TEXT_LANGUAGE_LABELS,
  TEXT_LANGUAGES,
  wordList,
  type ListSize,
  type TextLanguage,
} from "./words";

/** Common words, or a quote. */
export type TextSource = "words" | "quote";
/** Words tests run against the clock or for a number of words. */
export type TextMode = "time" | "words";

export const TEXT_SOURCES: readonly TextSource[] = ["words", "quote"];
export const TEXT_MODES: readonly TextMode[] = ["time", "words"];
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

/** Share of words that become numbers, and of words that get a mark. */
const NUMBER_RATE = 0.1;
const PUNCTUATION_RATE = 0.25;
/** Commas and periods are the most common marks, so they appear twice. */
const MARKS = [",", ",", ".", ".", "?", "!", ";", ":"] as const;
const SENTENCE_END = /[.?!]$/;

function oneOf<T>(options: readonly T[], value: unknown, fallback: T): T {
  return options.includes(value as T) ? (value as T) : fallback;
}

function flag(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

/** Settings from untrusted JSON; each invalid field takes its default. */
export function parseTextSettings(value: unknown): TextSettings {
  const v: Record<string, unknown> =
    typeof value === "object" && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const d = DEFAULT_TEXT_SETTINGS;
  return {
    source: oneOf(TEXT_SOURCES, v["source"], d.source),
    language: oneOf(TEXT_LANGUAGES, v["language"], d.language),
    listSize: oneOf(LIST_SIZES, v["listSize"], d.listSize),
    mode: oneOf(TEXT_MODES, v["mode"], d.mode),
    seconds: oneOf(TIME_OPTIONS, v["seconds"], d.seconds),
    wordCount: oneOf(WORD_COUNT_OPTIONS, v["wordCount"], d.wordCount),
    punctuation: flag(v["punctuation"], d.punctuation),
    numbers: flag(v["numbers"], d.numbers),
    lenientAccents: flag(v["lenientAccents"], d.lenientAccents),
  };
}

/**
 * Word `index` before capitalization. Its RNG always draws in the same
 * order (word, number roll, digits, value, mark roll, mark), so options
 * only decorate the word the seed picks.
 */
function rawWordAt(seed: number, settings: TextSettings, index: number): string {
  const rng = createRng(deriveSeed(seed, index));
  const word = rng.pick(wordList(settings.language, settings.listSize));
  const numberRoll = rng.next();
  const digits = rng.int(1, 4);
  const value = rng.int(digits === 1 ? 1 : 10 ** (digits - 1), 10 ** digits - 1);
  const markRoll = rng.next();
  const mark = rng.pick(MARKS);
  const token = settings.numbers && numberRoll < NUMBER_RATE ? String(value) : word;
  return settings.punctuation && markRoll < PUNCTUATION_RATE ? token + mark : token;
}

/** Word `index` of the words test seeded with `seed` (ADR-T12-1). */
export function wordAt(seed: number, settings: TextSettings, index: number): string {
  const word = rawWordAt(seed, settings, index);
  if (!settings.punctuation) return word;
  const sentenceStart = index === 0 || SENTENCE_END.test(rawWordAt(seed, settings, index - 1));
  return sentenceStart ? word.charAt(0).toUpperCase() + word.slice(1) : word;
}

/** Words `from` to `from + count − 1`. */
export function wordsFrom(
  seed: number,
  settings: TextSettings,
  from: number,
  count: number,
): string[] {
  return Array.from({ length: count }, (_, i) => wordAt(seed, settings, from + i));
}

/** The words a test starts with. */
export function initialWords(seed: number, settings: TextSettings): string[] {
  if (settings.source === "quote") return pickQuote(seed, settings.language).text.split(" ");
  const count = settings.mode === "time" ? TIME_LOOKAHEAD : settings.wordCount;
  return wordsFrom(seed, settings, 0, count);
}

/** Length of a time test, or null when the test ends with its words. */
export function timeLimitMs(settings: TextSettings): number | null {
  return settings.source === "words" && settings.mode === "time" ? settings.seconds * 1000 : null;
}

/** The settings that change a test, ignoring those its source and mode do not use. */
function relevant(settings: TextSettings): (string | number | boolean)[] {
  const { source, language, lenientAccents } = settings;
  if (source === "quote") return [source, language, lenientAccents];
  const size = settings.mode === "time" ? settings.seconds : settings.wordCount;
  return [
    source,
    language,
    settings.listSize,
    settings.mode,
    size,
    settings.punctuation,
    settings.numbers,
    lenientAccents,
  ];
}

/** Identifies the settings that change a test, for the summary. */
export function textConfigKey(settings: TextSettings): string {
  return relevant(settings).join(":");
}

/** The settings that change a test, in words. */
export function textConfigLabel(settings: TextSettings): string {
  const language = TEXT_LANGUAGE_LABELS[settings.language].toLowerCase();
  const parts =
    settings.source === "quote"
      ? ["frase", language]
      : [
          "palavras",
          language,
          String(settings.listSize),
          settings.mode === "time"
            ? `${String(settings.seconds)} s`
            : `${String(settings.wordCount)} palavras`,
        ];
  if (settings.source === "words" && settings.punctuation) parts.push("pontuação");
  if (settings.source === "words" && settings.numbers) parts.push("números");
  if (settings.lenientAccents) parts.push("acentos opcionais");
  return parts.join(" · ");
}
