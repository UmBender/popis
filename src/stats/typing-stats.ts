import { CORPUS } from "../typing/corpus";
import type { TrainingEvent } from "./event";
import { quartiles } from "./summary";

export const MIN_BIGRAM_COUNT = 5;

export type BigramStat = {
  readonly bigram: string;
  readonly medianMs: number;
  readonly count: number;
  readonly symbol: boolean;
};

export type CharErrorStat = {
  readonly char: string;
  readonly errors: number;
  readonly total: number;
  readonly errorRate: number;
  readonly symbol: boolean;
};

const SNIPPET_LINES = new Map<string, readonly string[]>(
  CORPUS.map((s) => [s.id, s.text.split("\n")]),
);

const SYMBOL_RE = /[^a-zA-Z0-9\s\u00C0-\u024F]/;

/** True when `text` contains a code symbol (non-alphanumeric, non-whitespace). */
export function isCodeSymbol(text: string): boolean {
  return SYMBOL_RE.test(text);
}

/** Expected text of a typing event (word for `typing.text`, line for `typing.code`). */
function unitText(event: TrainingEvent): string | null {
  if (event.drill === "typing.text") {
    const w = event.extra["w"];
    return typeof w === "string" ? w : null;
  }
  if (event.drill === "typing.code") {
    const id = event.extra["snippet"];
    if (typeof id !== "string") return null;
    return SNIPPET_LINES.get(id)?.[event.extra.i] ?? null;
  }
  return null;
}

/** Slowest bigrams with at least `MIN_BIGRAM_COUNT` (5) occurrences, median interval descending. */
export function slowestBigrams(events: readonly TrainingEvent[], limit = 10): BigramStat[] {
  const intervals = new Map<string, number[]>();
  for (const event of events) {
    const text = unitText(event);
    const iv = event.extra["iv"];
    if (text === null || !Array.isArray(iv)) continue;
    const chars = [...text];
    const offset = event.extra.i === 0 ? 0 : 1;
    for (let k = 0; k + 1 < chars.length; k++) {
      const a = chars[k] as string;
      const b = chars[k + 1] as string;
      if (a.trim() === "" || b.trim() === "") continue;
      const ms = iv[offset + k];
      if (typeof ms !== "number" || !Number.isFinite(ms) || ms < 0) continue;
      const pair = a + b;
      const list = intervals.get(pair);
      if (list === undefined) intervals.set(pair, [ms]);
      else list.push(ms);
    }
  }
  return [...intervals.entries()]
    .filter(([, list]) => list.length >= MIN_BIGRAM_COUNT)
    .map(([bigram, list]): BigramStat => ({
      bigram,
      medianMs: quartiles(list)[1],
      count: list.length,
      symbol: isCodeSymbol(bigram),
    }))
    .sort((a, b) => b.medianMs - a.medianMs || a.bigram.localeCompare(b.bigram))
    .slice(0, limit);
}

/** Characters with the highest error rate across typing events. */
export function errorChars(events: readonly TrainingEvent[], limit = 10): CharErrorStat[] {
  const totals = new Map<string, number>();
  const errs = new Map<string, number>();
  for (const event of events) {
    const text = unitText(event);
    if (text !== null) {
      for (const ch of text) {
        if (ch.trim() !== "") totals.set(ch, (totals.get(ch) ?? 0) + 1);
      }
    }
    const bad = event.extra["bad"];
    if (!Array.isArray(bad)) continue;
    for (const pair of bad) {
      if (!Array.isArray(pair) || typeof pair[0] !== "string") continue;
      const expected = pair[0];
      if (expected.trim() === "") continue;
      errs.set(expected, (errs.get(expected) ?? 0) + 1);
    }
  }
  return [...errs.entries()]
    .map(([char, errors]): CharErrorStat => {
      const total = Math.max(totals.get(char) ?? errors, errors);
      return {
        char,
        errors,
        total,
        errorRate: errors / total,
        symbol: isCodeSymbol(char),
      };
    })
    .sort((a, b) => b.errorRate - a.errorRate || b.errors - a.errors || a.char.localeCompare(b.char))
    .slice(0, limit);
}
