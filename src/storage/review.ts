import type { Problem } from "../core/problem";
import { modeOfSkill, type ReviewItem } from "../gen/review";
import { isMode, MODES } from "../modes";
import type { Attempt } from "../session/engine";
import type { SessionRecord } from "./history";

/** At most this many items, the most recent first. */
export const MAX_REVIEW_ITEMS = 50;

/** A right answer slower than this many times its skill's mean is reviewed. */
export const SLOW_FACTOR = 1.5;

/** Mean time of the right answers of each skill in one session's log. */
function meanTimes(log: readonly Attempt[]): Map<string, number> {
  const totals = new Map<string, { sum: number; count: number }>();
  for (const { problem, outcome, timeMs } of log) {
    if (outcome !== "correct") continue;
    const total = totals.get(problem.skill) ?? { sum: 0, count: 0 };
    totals.set(problem.skill, { sum: total.sum + timeMs, count: total.count + 1 });
  }
  return new Map([...totals].map(([skill, { sum, count }]) => [skill, sum / count]));
}

/** Skipped, corrected or slow; the end-of-session timeout never counts. */
function needsReview(attempt: Attempt, means: ReadonlyMap<string, number>): boolean {
  switch (attempt.outcome) {
    case "timeout":
      return false;
    case "skipped":
      return true;
    case "correct": {
      const mean = means.get(attempt.problem.skill) ?? Infinity;
      return attempt.corrections > 0 || attempt.timeMs > SLOW_FACTOR * mean;
    }
  }
}

/** The item that replays `problem`, or null when it no longer regenerates exactly. */
function itemOf(problem: Problem): ReviewItem | null {
  const mode = modeOfSkill(problem.skill);
  if (!isMode(mode) || mode === "review") return null;
  const spec = MODES[mode];
  const params = spec.parseSettings(problem.params);
  if (params === null || spec.validate(params as never).length > 0) return null;
  try {
    const again = spec.generator.generate(problem.seed, params as never);
    const same =
      again.skill === problem.skill &&
      again.prompt === problem.prompt &&
      again.answer === problem.answer;
    return same ? { mode, seed: problem.seed, params } : null;
  } catch {
    return null;
  }
}

function isAttempt(value: unknown): value is Attempt {
  const problem = (value as { problem?: Partial<Problem> } | null)?.problem;
  return (
    typeof problem === "object" &&
    problem !== null &&
    typeof problem.skill === "string" &&
    typeof problem.seed === "number"
  );
}

/**
 * Problems to review, the most recent first: skipped ones, ones with
 * corrections and slow right answers, unique by skill and seed. Problems
 * that no longer regenerate exactly are left out.
 */
export function reviewItems(history: readonly SessionRecord[]): ReviewItem[] {
  const items: ReviewItem[] = [];
  const seen = new Set<string>();
  for (const session of [...history].reverse()) {
    const log = session.log.filter(isAttempt);
    const means = meanTimes(log);
    for (const attempt of [...log].reverse()) {
      if (items.length === MAX_REVIEW_ITEMS) return items;
      const key = `${attempt.problem.skill}#${String(attempt.problem.seed)}`;
      if (seen.has(key) || !needsReview(attempt, means)) continue;
      seen.add(key);
      const item = itemOf(attempt.problem);
      if (item !== null) items.push(item);
    }
  }
  return items;
}
