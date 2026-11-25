import type { TrainingEvent } from "../stats/event";
import type { RegexDialect } from "./compile";
import type { RegexItem, RegexItemKind } from "./types";

export const REGEX_ROUND_LENGTH = 5;

export type RegexRoundConfig = {
  readonly seed: number;
  readonly dialect: RegexDialect;
  readonly kinds: readonly RegexItemKind[];
};

export type RegexItemRecord = {
  readonly index: number;
  readonly item: RegexItem;
  readonly ok: boolean;
  readonly skipped: boolean;
  readonly attempts: number;
  readonly timeMs: number;
};

export type RegexRound = {
  readonly config: RegexRoundConfig;
  readonly items: readonly RegexItem[];
  readonly index: number;
  readonly startedAt: number | null;
  readonly itemStartedAt: number | null;
  readonly finishedAt: number | null;
  readonly currentAttempts: number;
  readonly skippedCurrent: boolean;
  readonly records: readonly RegexItemRecord[];
};

export type RegexRoundStats = {
  readonly total: number;
  readonly correct: number;
  readonly skipped: number;
  readonly totalAttempts: number;
  readonly totalTimeMs: number;
  readonly records: readonly RegexItemRecord[];
};

export function startRegexRound(_config: RegexRoundConfig): RegexRound {
  throw new Error("todo");
}

export function touchRegexRound(_round: RegexRound, _nowMs: number): RegexRound {
  throw new Error("todo");
}

export function recordRegexAttempt(
  _round: RegexRound,
  _passed: boolean,
  _nowMs: number,
): RegexRound {
  throw new Error("todo");
}

export function revealSkipRegexItem(_round: RegexRound, _nowMs: number): RegexRound {
  throw new Error("todo");
}

export function advanceSkippedRegexItem(_round: RegexRound, _nowMs: number): RegexRound {
  throw new Error("todo");
}

export function isRegexRoundFinished(_round: RegexRound): boolean {
  throw new Error("todo");
}

export function regexElapsedMs(_round: RegexRound, _nowMs: number): number {
  throw new Error("todo");
}

export function regexRoundStats(_round: RegexRound): RegexRoundStats {
  throw new Error("todo");
}

export function regexPracticeEvents(_round: RegexRound, _wallTimeMs: number): TrainingEvent[] {
  throw new Error("todo");
}
