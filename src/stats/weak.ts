import type { TrainingEvent } from "./event";

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

export function ngramIntervals(_events: readonly TrainingEvent[], _ngram: string): number[] {
  throw new Error("todo");
}

export function selectWeakSpots(_events: readonly TrainingEvent[], _now: number): WeakSelection {
  throw new Error("todo");
}
