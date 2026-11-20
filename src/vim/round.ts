import type { Key } from "./keys";
import type { Level } from "./levels";
import type { VimTarget } from "./drills/target";
import type { VimState } from "./state";

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

export function startRound(_config: RoundConfig): Round {
  throw new Error("todo");
}

export function pressRoundKey(_round: Round, _key: Key, _now: number): Round {
  throw new Error("todo");
}

export function skipTarget(_round: Round, _now: number): Round {
  throw new Error("todo");
}

/** Ends the round when the time is up. */
export function tickRound(_round: Round, _now: number): Round {
  throw new Error("todo");
}

export function isRoundFinished(_round: Round): boolean {
  throw new Error("todo");
}

export function remainingMs(_round: Round, _now: number): number {
  throw new Error("todo");
}

/** Minimum over keys used, at most 1; 0 for a skipped target. */
export function targetEfficiency(_result: TargetResult): number {
  throw new Error("todo");
}

export function roundStats(_round: Pick<Round, "results">): RoundStats {
  throw new Error("todo");
}
