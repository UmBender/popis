import { DAY_MS } from "./summary";

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

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/** A fresh card, immediately due at `now`. */
export function newCard(now: number): FsrsCard {
  return { stability: 0, difficulty: 0, dueAt: now, lastReviewAt: null, reps: 0, lapses: 0 };
}

/** Probability of recall after `elapsedDays` with memory `stability` (days). */
export function retrievability(elapsedDays: number, stability: number): number {
  return (1 + (FSRS_FACTOR * Math.max(0, elapsedDays)) / stability) ** FSRS_DECAY;
}

/** Interval in days until retrievability falls to `desiredRetention`. */
export function nextIntervalDays(stability: number, desiredRetention = DEFAULT_RETENTION): number {
  return (stability / FSRS_FACTOR) * (desiredRetention ** (1 / FSRS_DECAY) - 1);
}

/** Updates an FSRS-4.5 card after a review with `rating` at `now`. */
export function reviewCard(
  card: FsrsCard,
  rating: Rating,
  now: number,
  desiredRetention = DEFAULT_RETENTION,
  weights: readonly number[] = FSRS_DEFAULT_WEIGHTS,
): FsrsCard {
  const w = weights;
  let stability: number;
  let difficulty: number;

  if (card.reps === 0 || card.lastReviewAt === null) {
    stability = w[rating - 1] as number;
    difficulty = clamp((w[4] as number) - (rating - 3) * (w[5] as number), 1, 10);
  } else {
    const elapsedDays = Math.max(0, (now - card.lastReviewAt) / DAY_MS);
    const r = retrievability(elapsedDays, card.stability);
    const nextD = card.difficulty - (w[6] as number) * (rating - 3);
    difficulty = clamp((w[7] as number) * (w[4] as number) + (1 - (w[7] as number)) * nextD, 1, 10);
    if (rating === 1) {
      const forget =
        (w[11] as number) *
        Math.pow(card.difficulty, -(w[12] as number)) *
        (Math.pow(card.stability + 1, w[13] as number) - 1) *
        Math.exp((w[14] as number) * (1 - r));
      stability = Math.min(card.stability, Math.max(0.1, forget));
    } else {
      const hardPenalty = rating === 2 ? (w[15] as number) : 1;
      const easyBonus = rating === 4 ? (w[16] as number) : 1;
      const growth =
        1 +
        Math.exp(w[8] as number) *
          (11 - card.difficulty) *
          Math.pow(card.stability, -(w[9] as number)) *
          (Math.exp((w[10] as number) * (1 - r)) - 1) *
          hardPenalty *
          easyBonus;
      stability = card.stability * growth;
    }
  }

  const intervalMs = Math.round(nextIntervalDays(stability, desiredRetention) * DAY_MS);
  return {
    stability,
    difficulty,
    dueAt: now + intervalMs,
    lastReviewAt: now,
    reps: card.reps + 1,
    lapses: card.lapses + (rating === 1 ? 1 : 0),
  };
}

export function isDue(card: FsrsCard, now: number): boolean {
  return card.dueAt <= now;
}

/**
 * Derives the FSRS rating 1–4 from an attempt:
 * 1 = missed/skipped, 2 = slow or had corrections, 3 = right, 4 = right below median.
 */
export function gradeAttempt({
  ok,
  corrections,
  timeMs,
  medianMs,
}: {
  readonly ok: boolean;
  readonly corrections: number;
  readonly timeMs: number;
  readonly medianMs: number | null;
}): Rating {
  if (!ok) return 1;
  if (corrections > 0 || (medianMs !== null && timeMs > medianMs * 1.5)) return 2;
  if (medianMs !== null && timeMs < medianMs) return 4;
  return 3;
}
