import type { Attempt } from "./engine";

export type SkillStats = {
  readonly skill: string;
  readonly count: number;
  readonly meanMs: number;
};

export type Summary = {
  readonly score: number;
  readonly skipped: number;
  /** Mean time of correct answers, or null without any. */
  readonly meanMs: number | null;
  /** Per skill, slowest mean first. */
  readonly bySkill: readonly SkillStats[];
  /** Slowest correct answers, slowest first. */
  readonly slowest: readonly Attempt[];
};

function mean(values: readonly number[]): number {
  return values.reduce((sum, x) => sum + x, 0) / values.length;
}

/** Times and counts use correct answers only; skips and timeouts say nothing about speed. */
export function summarize(log: readonly Attempt[], slowestCount = 5): Summary {
  const correct = log.filter((a) => a.outcome === "correct");

  const timesBySkill = new Map<string, number[]>();
  for (const a of correct) {
    const times = timesBySkill.get(a.problem.skill) ?? [];
    times.push(a.timeMs);
    timesBySkill.set(a.problem.skill, times);
  }
  const bySkill = [...timesBySkill]
    .map(([skill, times]) => ({ skill, count: times.length, meanMs: mean(times) }))
    .sort((a, b) => b.meanMs - a.meanMs);

  return {
    score: correct.length,
    skipped: log.filter((a) => a.outcome === "skipped").length,
    meanMs: correct.length > 0 ? mean(correct.map((a) => a.timeMs)) : null,
    bySkill,
    // Array.prototype.sort is stable, so ties keep log order.
    slowest: [...correct].sort((a, b) => b.timeMs - a.timeMs).slice(0, slowestCount),
  };
}
