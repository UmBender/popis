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

export function summarize(_log: readonly Attempt[], _slowestCount = 5): Summary {
  throw new Error("todo");
}
