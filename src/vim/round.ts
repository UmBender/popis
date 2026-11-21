import { generateTarget, type VimTarget } from "./drills/target";
import { pressKey } from "./engine";
import type { Key } from "./keys";
import type { Level } from "./levels";
import { createState, type VimState } from "./state";

export const ROUND_DURATIONS_S = [30, 60, 120] as const;

export type RoundConfig = {
  readonly level: Level;
  readonly durationMs: number;
  readonly seed: number;
};

/** What happened to one target. */
export type TargetResult = {
  readonly index: number;
  readonly seed: number;
  readonly snippetId: string;
  /** Keys typed on the target, blocked ones included. */
  readonly keys: number;
  readonly minimum: number;
  /** The optimal solution in Vim notation. */
  readonly solution: string;
  readonly timeMs: number;
  readonly skipped: boolean;
  /** Whether the optimal preview was visible at any point during this target (T21 AC-4). */
  readonly assisted?: boolean;
};

export type Round = {
  readonly config: RoundConfig;
  readonly target: VimTarget;
  readonly vim: VimState;
  /** Keys typed on the current target. */
  readonly keys: number;
  /** When the first key was typed; null before. */
  readonly startedAt: number | null;
  /** When the current target appeared (or the first key came). */
  readonly targetStartedAt: number | null;
  /** When the current target started or the last key was typed. */
  readonly lastActivityAt: number | null;
  /** When the round was paused (e.g. reading a lesson), or null. */
  readonly pausedAt: number | null;
  /** Whether the optimal preview was shown on the current target. */
  readonly assisted: boolean;
  readonly results: readonly TargetResult[];
  /** The blocked command of the last key, or null. */
  readonly blocked: string | null;
  /** The last finished target. */
  readonly last: TargetResult | null;
  readonly finished: boolean;
};

export type RoundStats = {
  readonly reached: number;
  readonly skipped: number;
  /** Mean efficiency of the reached targets, 0 to 1. */
  readonly efficiency: number;
  /** Up to 3 reached targets with the worst efficiency first. */
  readonly worst: readonly TargetResult[];
};

const WORST_COUNT = 3;

function showTarget(config: RoundConfig, index: number): Pick<Round, "target" | "vim"> {
  const target = generateTarget(config.seed, index, config.level);
  return { target, vim: createState(target.lines, target.start) };
}

export function startRound(config: RoundConfig): Round {
  return {
    config,
    ...showTarget(config, 0),
    keys: 0,
    startedAt: null,
    targetStartedAt: null,
    lastActivityAt: null,
    pausedAt: null,
    assisted: false,
    results: [],
    blocked: null,
    last: null,
    finished: false,
  };
}

const timeIsUp = (round: Round, now: number): boolean =>
  round.startedAt !== null && (round.pausedAt ?? now) >= round.startedAt + round.config.durationMs;

/** Records the current target as done and shows the next one. */
function finishTarget(round: Round, now: number, keys: number, skipped: boolean): Round {
  const { target } = round;
  const result: TargetResult = {
    index: target.index,
    seed: target.seed,
    snippetId: target.snippetId,
    keys,
    minimum: target.minimum,
    solution: target.solution,
    timeMs: now - (round.targetStartedAt ?? now),
    skipped,
    assisted: round.assisted,
  };
  return {
    ...round,
    ...showTarget(round.config, target.index + 1),
    keys: 0,
    startedAt: round.startedAt ?? now,
    targetStartedAt: now,
    lastActivityAt: now,
    assisted: false,
    results: [...round.results, result],
    blocked: null,
    last: result,
  };
}

export function pressRoundKey(round: Round, key: Key, now: number): Round {
  if (round.finished || round.pausedAt !== null) return round;
  if (timeIsUp(round, now)) return { ...round, finished: true };
  const typed = pressKey(round.vim, key, round.config.level);
  const keys = round.keys + 1;
  const { cursor } = typed.state;
  const started = {
    startedAt: round.startedAt ?? now,
    targetStartedAt: round.targetStartedAt ?? now,
    lastActivityAt: now,
  };
  if (cursor.line === round.target.target.line && cursor.col === round.target.target.col) {
    return finishTarget({ ...round, ...started }, now, keys, false);
  }
  return { ...round, ...started, vim: typed.state, keys, blocked: typed.blocked };
}

export function skipTarget(round: Round, now: number): Round {
  if (round.finished || round.pausedAt !== null) return round;
  if (timeIsUp(round, now)) return { ...round, finished: true };
  return finishTarget(round, now, round.keys, true);
}

/** Ends the round when the time is up. */
export function tickRound(round: Round, now: number): Round {
  if (round.finished || round.pausedAt !== null) return round;
  return timeIsUp(round, now) ? { ...round, finished: true } : round;
}

export function isRoundFinished(round: Round): boolean {
  return round.finished;
}

export function remainingMs(round: Round, now: number): number {
  if (round.finished) return 0;
  if (round.startedAt === null) return round.config.durationMs;
  const effectiveNow = round.pausedAt ?? now;
  return Math.max(0, round.startedAt + round.config.durationMs - effectiveNow);
}

/** Minimum over keys used, at most 1; 0 for a skipped target. */
export function targetEfficiency(result: TargetResult): number {
  if (result.skipped || result.keys === 0) return 0;
  return Math.min(1, result.minimum / result.keys);
}

export function roundStats(round: Pick<Round, "results">): RoundStats {
  const reached = round.results.filter((r) => !r.skipped);
  const total = reached.reduce((sum, r) => sum + targetEfficiency(r), 0);
  return {
    reached: reached.length,
    skipped: round.results.length - reached.length,
    efficiency: reached.length === 0 ? 0 : total / reached.length,
    worst: [...reached]
      .sort((a, b) => targetEfficiency(a) - targetEfficiency(b))
      .slice(0, WORST_COUNT),
  };
}

export function markAssisted(round: Round): Round {
  return round.finished || round.assisted ? round : { ...round, assisted: true };
}

export function pauseRound(round: Round, now: number): Round {
  return round.finished || round.pausedAt !== null ? round : { ...round, pausedAt: now };
}

export function resumeRound(round: Round, now: number): Round {
  if (round.pausedAt === null) return round;
  const pausedFor = Math.max(0, now - round.pausedAt);
  return {
    ...round,
    pausedAt: null,
    startedAt: round.startedAt !== null ? round.startedAt + pausedFor : null,
    targetStartedAt: round.targetStartedAt !== null ? round.targetStartedAt + pausedFor : null,
    lastActivityAt: round.lastActivityAt !== null ? round.lastActivityAt + pausedFor : null,
  };
}

export function idleMs(round: Round, now: number): number {
  if (round.finished || round.startedAt === null) return 0;
  const effectiveNow = round.pausedAt ?? now;
  const since = round.lastActivityAt ?? round.targetStartedAt ?? effectiveNow;
  return Math.max(0, effectiveNow - since);
}
