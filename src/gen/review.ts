import type { Generator, JsonValue, Problem } from "../core/problem";
import { createRng } from "../core/rng";

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
  const dot = skill.indexOf(".");
  return dot < 0 ? skill : skill.slice(0, dot);
}

/** The stored review settings are ignored: items come from history. */
export const parseReviewSettings: (value: unknown) => ReviewSettings = () => DEFAULT_REVIEW;

/** Review settings never block a start; the config checks the item count. */
export const validateReview: (settings: ReviewSettings) => readonly string[] = () => [];

/**
 * The review generator: picks an item with the problem's seed and replays
 * it with the generator `resolve` gives for the item's mode. The problem
 * is the original one, so its skill (and the mode it implies) is kept.
 */
export function createReview(
  resolve: (mode: string) => Generator<JsonValue> | undefined,
): Generator<ReviewSettings> {
  return {
    id: "review",

    generate(seed: number, params: ReviewSettings): Problem {
      if (params.items.length === 0) throw new RangeError("nothing to review");
      const item = createRng(seed).pick(params.items);
      const generator = resolve(item.mode);
      if (generator === undefined) throw new RangeError(`cannot replay mode ${item.mode}`);
      return generator.generate(item.seed, item.params);
    },

    check(problem: Problem, input: string): boolean {
      return resolve(modeOfSkill(problem.skill))?.check(problem, input) ?? false;
    },
  };
}
