export const FSRS_VERSION = "FSRS-4.5";
export const FSRS_DECAY = -0.5;
export const FSRS_FACTOR = 19 / 81;
export const DEFAULT_RETENTION = 0.9;

/** Published default 17 parameters for FSRS-4.5 (ADR-T24-1). */
export const FSRS_DEFAULT_WEIGHTS: readonly number[] = [
  0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474, 0.1367, 1.0461, 2.1072,
  0.0793, 0.3246, 1.587, 0.2272, 2.8755,
];

/** 1 = Again (errou), 2 = Hard (acertou devagar), 3 = Good (acertou), 4 = Easy (abaixo da mediana). */
export type Rating = 1 | 2 | 3 | 4;

export type FsrsCard = {
  readonly stability: number;
  readonly difficulty: number;
  readonly dueAt: number;
  readonly lastReviewAt: number | null;
  readonly reps: number;
  readonly lapses: number;
};

export function newCard(_now: number): FsrsCard {
  throw new Error("todo");
}

export function retrievability(_elapsedDays: number, _stability: number): number {
  throw new Error("todo");
}

export function nextIntervalDays(_stability: number, _desiredRetention?: number): number {
  throw new Error("todo");
}

export function reviewCard(
  _card: FsrsCard,
  _rating: Rating,
  _now: number,
  _desiredRetention?: number,
  _weights?: readonly number[],
): FsrsCard {
  throw new Error("todo");
}

export function isDue(_card: FsrsCard, _now: number): boolean {
  throw new Error("todo");
}

export function gradeAttempt(_params: {
  readonly ok: boolean;
  readonly corrections: number;
  readonly timeMs: number;
  readonly medianMs: number | null;
}): Rating {
  throw new Error("todo");
}
