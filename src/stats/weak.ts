import type { TrainingEvent } from "./event";
import { DAY_MS, quartiles } from "./summary";
import { errorChars, isCodeSymbol, MIN_BIGRAM_COUNT, typingUnitText } from "./typing-stats";

/** Days of typing history considered for weak-spot selection (ADR-T30-1). */
export const WEAK_WINDOW_DAYS = 14;
/** Number of slowest bigrams/trigrams selected. */
export const WEAK_NGRAM_LIMIT = 4;
/** Number of highest-error characters selected. */
export const WEAK_ERROR_CHAR_LIMIT = 2;

export type WeakNgram = {
  readonly ngram: string;
  readonly medianMs: number;
  readonly count: number;
  readonly symbol: boolean;
};

export type WeakChar = {
  readonly char: string;
  readonly errors: number;
  readonly total: number;
  readonly errorRate: number;
  readonly medianMs: number | null;
  readonly symbol: boolean;
};

export type WeakTarget = {
  readonly ngram: string;
  readonly kind: "slow" | "error";
  readonly beforeMedianMs: number | null;
  readonly errorRate: number | null;
  readonly symbol: boolean;
};

export type WeakSelection = {
  readonly ngrams: readonly WeakNgram[];
  readonly errorChars: readonly WeakChar[];
  readonly targets: readonly WeakTarget[];
};

const WHITESPACE_RE = /\s/;

function isFiniteNonNeg(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isTypingDrill(event: TrainingEvent): boolean {
  return (
    event.drill === "typing.code" || event.drill === "typing.text" || event.drill === "typing.weak"
  );
}

function compareCodePoints(a: string, b: string): number {
  return a < b ? -1 : 1;
}

/**
 * Per-character transition intervals (in ms) for every occurrence of `ngram` in `events`.
 * Bigrams use `iv[offset + k]`, trigrams use the mean of their two transitions,
 * and single characters use the arrival interval `iv[offset + k - 1]` when present.
 */
export function ngramIntervals(events: readonly TrainingEvent[], ngram: string): number[] {
  const needle = [...ngram];
  const len = needle.length;
  if (len === 0) return [];
  const out: number[] = [];
  for (const event of events) {
    const text = typingUnitText(event);
    const iv = event.extra["iv"];
    if (text === null || !Array.isArray(iv)) continue;
    const chars = [...text];
    const offset = event.extra.i === 0 ? 0 : 1;
    for (let k = 0; k + len <= chars.length; k++) {
      let match = true;
      for (let j = 0; j < len; j++) {
        if (chars[k + j] !== needle[j]) {
          match = false;
          break;
        }
      }
      if (!match) continue;
      if (len === 1) {
        const idx = offset + k - 1;
        if (idx >= 0 && isFiniteNonNeg(iv[idx])) out.push(iv[idx]);
      } else {
        let sum = 0;
        let valid = true;
        for (let j = 0; j < len - 1; j++) {
          const ms: unknown = iv[offset + k + j];
          if (!isFiniteNonNeg(ms)) {
            valid = false;
            break;
          }
          sum += ms;
        }
        if (valid) out.push(sum / (len - 1));
      }
    }
  }
  return out;
}

/**
 * Selects the 4 slowest bigrams/trigrams (with >= MIN_BIGRAM_COUNT samples) and
 * the 2 highest-error characters from typing events in the last 14 days (ADR-T30-1).
 */
export function selectWeakSpots(events: readonly TrainingEvent[], now: number): WeakSelection {
  const cutoff = now - WEAK_WINDOW_DAYS * DAY_MS;
  const recent = events.filter((e) => isTypingDrill(e) && e.at >= cutoff);
  const intervals = new Map<string, number[]>();
  const record = (key: string, ms: number) => {
    const list = intervals.get(key);
    if (list === undefined) intervals.set(key, [ms]);
    else list.push(ms);
  };

  for (const event of recent) {
    const text = typingUnitText(event);
    const iv = event.extra["iv"];
    if (text === null || !Array.isArray(iv)) continue;
    const chars = [...text];
    const offset = event.extra.i === 0 ? 0 : 1;
    for (let k = 0; k + 1 < chars.length; k++) {
      const a = chars[k] as string;
      const b = chars[k + 1] as string;
      if (WHITESPACE_RE.test(a) || WHITESPACE_RE.test(b)) continue;
      const ms1: unknown = iv[offset + k];
      if (!isFiniteNonNeg(ms1)) continue;
      record(a + b, ms1);
      if (k + 2 < chars.length) {
        const c = chars[k + 2] as string;
        const ms2: unknown = iv[offset + k + 1];
        if (!WHITESPACE_RE.test(c) && isFiniteNonNeg(ms2)) {
          record(a + b + c, (ms1 + ms2) / 2);
        }
      }
    }
  }

  const ngrams: WeakNgram[] = [...intervals.entries()]
    .filter(([, list]) => list.length >= MIN_BIGRAM_COUNT)
    .map(([ngram, list]): WeakNgram => ({
      ngram,
      medianMs: quartiles(list)[1],
      count: list.length,
      symbol: isCodeSymbol(ngram),
    }))
    .sort((a, b) => b.medianMs - a.medianMs || compareCodePoints(a.ngram, b.ngram))
    .slice(0, WEAK_NGRAM_LIMIT);

  const chars: WeakChar[] = errorChars(recent, WEAK_ERROR_CHAR_LIMIT).map((c): WeakChar => {
    const samples = ngramIntervals(recent, c.char);
    return {
      ...c,
      medianMs: samples.length > 0 ? quartiles(samples)[1] : null,
    };
  });

  const targets: WeakTarget[] = [
    ...ngrams.map((n): WeakTarget => ({
      ngram: n.ngram,
      kind: "slow",
      beforeMedianMs: n.medianMs,
      errorRate: null,
      symbol: n.symbol,
    })),
    ...chars.map((c): WeakTarget => ({
      ngram: c.char,
      kind: "error",
      beforeMedianMs: c.medianMs,
      errorRate: c.errorRate,
      symbol: c.symbol,
    })),
  ];

  return { ngrams, errorChars: chars, targets };
}
