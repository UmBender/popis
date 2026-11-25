import type { TrainingEvent } from "../stats/event";
import type { RegexDialect } from "./compile";
import { generateRegexItem } from "./drill";
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

export function startRegexRound(config: RegexRoundConfig): RegexRound {
  const items = Array.from({ length: REGEX_ROUND_LENGTH }, (_, i) =>
    generateRegexItem(config.seed, i, config.dialect, config.kinds),
  );
  return {
    config,
    items,
    index: 0,
    startedAt: null,
    itemStartedAt: null,
    finishedAt: null,
    currentAttempts: 0,
    skippedCurrent: false,
    records: [],
  };
}

export function isRegexRoundFinished(round: RegexRound): boolean {
  return round.finishedAt !== null;
}

export function touchRegexRound(round: RegexRound, nowMs: number): RegexRound {
  if (isRegexRoundFinished(round) || round.startedAt !== null) return round;
  return { ...round, startedAt: nowMs, itemStartedAt: nowMs };
}

export function recordRegexAttempt(round: RegexRound, passed: boolean, nowMs: number): RegexRound {
  if (isRegexRoundFinished(round) || round.skippedCurrent) return round;
  const startedAt = round.startedAt ?? nowMs;
  const itemStartedAt = round.itemStartedAt ?? nowMs;
  const attempts = round.currentAttempts + 1;

  if (!passed) {
    return { ...round, startedAt, itemStartedAt, currentAttempts: attempts };
  }

  const item = round.items[round.index]!;
  const record: RegexItemRecord = {
    index: round.index,
    item,
    ok: true,
    skipped: false,
    attempts,
    timeMs: Math.max(0, nowMs - itemStartedAt),
  };
  const records = [...round.records, record];
  const nextIndex = round.index + 1;
  const done = nextIndex >= round.items.length;
  return {
    ...round,
    startedAt,
    itemStartedAt: done ? itemStartedAt : nowMs,
    finishedAt: done ? nowMs : null,
    index: done ? round.index : nextIndex,
    currentAttempts: 0,
    skippedCurrent: false,
    records,
  };
}

/** First step of skipping: marks the current item as skipped and reveals its canonical answer. */
export function revealSkipRegexItem(round: RegexRound, nowMs: number): RegexRound {
  if (isRegexRoundFinished(round) || round.skippedCurrent) return round;
  const startedAt = round.startedAt ?? nowMs;
  const itemStartedAt = round.itemStartedAt ?? nowMs;
  const item = round.items[round.index]!;
  const record: RegexItemRecord = {
    index: round.index,
    item,
    ok: false,
    skipped: true,
    attempts: round.currentAttempts,
    timeMs: Math.max(0, nowMs - itemStartedAt),
  };
  return {
    ...round,
    startedAt,
    itemStartedAt,
    skippedCurrent: true,
    records: [...round.records, record],
  };
}

/** Second step of skipping: advances to the next item (or finishes on item 5). */
export function advanceSkippedRegexItem(round: RegexRound, nowMs: number): RegexRound {
  if (!round.skippedCurrent) return round;
  const nextIndex = round.index + 1;
  const done = nextIndex >= round.items.length;
  return {
    ...round,
    index: done ? round.index : nextIndex,
    itemStartedAt: done ? round.itemStartedAt : nowMs,
    finishedAt: done ? nowMs : null,
    currentAttempts: 0,
    skippedCurrent: false,
  };
}

export function regexElapsedMs(round: RegexRound, nowMs: number): number {
  if (round.startedAt === null) return 0;
  const end = round.finishedAt ?? nowMs;
  return Math.max(0, end - round.startedAt);
}

export function regexRoundStats(round: RegexRound): RegexRoundStats {
  const correct = round.records.filter((r) => r.ok).length;
  const skipped = round.records.filter((r) => r.skipped).length;
  const totalAttempts = round.records.reduce((sum, r) => sum + r.attempts, 0);
  const totalTimeMs =
    round.startedAt !== null && round.finishedAt !== null
      ? Math.max(0, round.finishedAt - round.startedAt)
      : round.records.reduce((sum, r) => sum + r.timeMs, 0);
  return {
    total: round.items.length,
    correct,
    skipped,
    totalAttempts,
    totalTimeMs,
    records: round.records,
  };
}

/** One T22 TrainingEvent per item in a finished regex practice round (AC-5). */
export function regexPracticeEvents(round: RegexRound, wallTimeMs: number): TrainingEvent[] {
  return round.records.map((r) => ({
    at: wallTimeMs,
    drill: "regex.practice",
    config: round.config.dialect,
    kc: r.item.kc,
    ok: r.ok,
    timeMs: r.timeMs,
    extra: {
      seed: round.config.seed,
      i: r.index,
      kind: r.item.kind,
      dialect: r.item.dialect,
      attempts: r.attempts,
      skipped: r.skipped,
    },
  }));
}
