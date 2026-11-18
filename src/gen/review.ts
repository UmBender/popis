import type { Generator, JsonValue } from "../core/problem";

/** A problem to replay: the mode that made it, its seed and its params. */
export type ReviewItem = {
  readonly mode: string;
  readonly seed: number;
  readonly params: JsonValue;
};

/** Params of the review generator; the items are built from history at start. */
export type ReviewSettings = { readonly items: readonly ReviewItem[] };

/** What the settings keep: never items (ADR-T06-1). */
export const DEFAULT_REVIEW: ReviewSettings = { items: [] };

/** Mode of a problem: its skill's prefix before the first dot. */
export function modeOfSkill(skill: string): string {
  throw new Error(`todo ${skill}`);
}

/** The stored review settings are ignored: items come from history. */
export function parseReviewSettings(_value: unknown): ReviewSettings {
  throw new Error("todo");
}

/** Review settings never block a start; the config checks the item count. */
export function validateReview(_settings: ReviewSettings): readonly string[] {
  throw new Error("todo");
}

/**
 * The review generator: picks an item with the problem's seed and replays
 * it with the generator `resolve` gives for the item's mode.
 */
export function createReview(
  resolve: (mode: string) => Generator<JsonValue> | undefined,
): Generator<ReviewSettings> {
  return {
    id: "review",
    generate() {
      throw new Error(`todo ${typeof resolve}`);
    },
    check() {
      throw new Error("todo");
    },
  };
}
