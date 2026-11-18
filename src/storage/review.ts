import type { ReviewItem } from "../gen/review";
import type { SessionRecord } from "./history";

/** At most this many items, the most recent first. */
export const MAX_REVIEW_ITEMS = 50;

/** A right answer slower than this many times its skill's mean is reviewed. */
export const SLOW_FACTOR = 1.5;

/**
 * Problems to review, the most recent first: skipped ones, ones with
 * corrections and slow right answers, unique by skill and seed. Problems
 * that no longer regenerate exactly are left out.
 */
export function reviewItems(history: readonly SessionRecord[]): ReviewItem[] {
  throw new Error(`todo ${history.length}`);
}
