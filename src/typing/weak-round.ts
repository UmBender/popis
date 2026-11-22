import type { TrainingEvent } from "../stats/event";
import { textEvents, type KeyTrace } from "../stats/keytrace";
import type { WeakTarget } from "../stats/weak";
import { PACE_ACCURACY_FLOOR, targetIntervalMs } from "./pace";

export const WEAK_BLOCK_SECONDS = 30;
export const WEAK_BLOCK_MS = WEAK_BLOCK_SECONDS * 1000;
export const WEAK_BLOCKS_PER_ROUND = 5;
export const WEAK_GRADUATION_ACCURACY = PACE_ACCURACY_FLOOR;

const EPS = 1e-9;

export type WeakBlockSummary = {
  readonly block: number;
  readonly ngram: string;
  readonly beforeMedianMs: number | null;
  readonly afterMedianMs: number | null;
  readonly accuracy: number;
  readonly graduated: boolean;
};

export type WeakNgramResult = {
  readonly ngram: string;
  readonly beforeMedianMs: number | null;
  readonly afterMedianMs: number | null;
  readonly blocks: number;
  readonly graduated: boolean;
};

export type WeakRoundState = {
  readonly queue: readonly WeakTarget[];
  readonly graduated: readonly string[];
  readonly blocks: readonly WeakBlockSummary[];
  readonly targetWpm: number;
  readonly maxBlocks: number;
  readonly finished: boolean;
};

export type WeakBlockResult = {
  readonly afterMedianMs: number | null;
  readonly accuracy: number;
};

export type WeakEventsMeta = {
  readonly at: number;
  readonly seed: number;
  readonly words: readonly string[];
  readonly ngram: string;
  readonly target?: number;
};

/** Starts a weak-spots round with up to `maxBlocks` 30s blocks (ADR-T30-1). */
export function startWeakRound(
  targets: readonly WeakTarget[],
  targetWpm: number,
  maxBlocks = WEAK_BLOCKS_PER_ROUND,
): WeakRoundState {
  if (targets.length === 0) throw new RangeError("weak round needs at least one target");
  return {
    queue: [...targets],
    graduated: [],
    blocks: [],
    targetWpm,
    maxBlocks,
    finished: false,
  };
}

/** Currently focused target, or null once the round has ended. */
export function currentWeakTarget(round: WeakRoundState): WeakTarget | null {
  return round.finished ? null : (round.queue[0] as WeakTarget);
}

/** Whether the focused n-gram graduates: median strictly under target interval at >= 95% accuracy. */
export function shouldGraduate(
  afterMedianMs: number | null,
  accuracy: number,
  targetWpm: number,
): boolean {
  return (
    afterMedianMs !== null &&
    afterMedianMs < targetIntervalMs(targetWpm) - EPS &&
    accuracy >= WEAK_GRADUATION_ACCURACY - EPS
  );
}

/** Records one completed 30s block, graduating the focused n-gram when it meets target pace. */
export function finishWeakBlock(
  round: WeakRoundState,
  result: WeakBlockResult,
): WeakRoundState {
  if (round.finished) return round;
  const active = round.queue[0] as WeakTarget;
  const graduated = shouldGraduate(result.afterMedianMs, result.accuracy, round.targetWpm);
  const summary: WeakBlockSummary = {
    block: round.blocks.length + 1,
    ngram: active.ngram,
    beforeMedianMs: active.beforeMedianMs,
    afterMedianMs: result.afterMedianMs,
    accuracy: result.accuracy,
    graduated,
  };
  const blocks = [...round.blocks, summary];
  const queue = graduated ? round.queue.slice(1) : round.queue;
  const nextGraduated = graduated ? [...round.graduated, active.ngram] : round.graduated;
  const finished = blocks.length >= round.maxBlocks || queue.length === 0;
  return { ...round, queue, graduated: nextGraduated, blocks, finished };
}

/** Per-n-gram summary of before/after median intervals across all blocks of a round. */
export function summarizeWeakRound(round: WeakRoundState): WeakNgramResult[] {
  const byNgram = new Map<string, WeakNgramResult>();
  for (const block of round.blocks) {
    const prev = byNgram.get(block.ngram);
    if (prev === undefined) {
      byNgram.set(block.ngram, {
        ngram: block.ngram,
        beforeMedianMs: block.beforeMedianMs,
        afterMedianMs: block.afterMedianMs,
        blocks: 1,
        graduated: block.graduated,
      });
    } else {
      byNgram.set(block.ngram, {
        ...prev,
        afterMedianMs: block.afterMedianMs ?? prev.afterMedianMs,
        blocks: prev.blocks + 1,
        graduated: prev.graduated || block.graduated,
      });
    }
  }
  return [...byNgram.values()];
}

/** Converts a weak-block key trace into `typing.weak` events with `typing.ngram.<ngram>` KC. */
export function weakEvents(trace: KeyTrace, meta: WeakEventsMeta): TrainingEvent[] {
  return textEvents(trace, {
    at: meta.at,
    config: "weak",
    seed: meta.seed,
    words: meta.words,
    target: meta.target,
  }).map((event) => ({
    ...event,
    drill: "typing.weak" as const,
    kc: `typing.ngram.${meta.ngram}`,
  }));
}
