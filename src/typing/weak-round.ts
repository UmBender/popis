import type { TrainingEvent } from "../stats/event";
import type { KeyTrace } from "../stats/keytrace";
import type { WeakTarget } from "../stats/weak";
import { PACE_ACCURACY_FLOOR } from "./pace";

export const WEAK_BLOCK_SECONDS = 30;
export const WEAK_BLOCK_MS = WEAK_BLOCK_SECONDS * 1000;
export const WEAK_BLOCKS_PER_ROUND = 5;
export const WEAK_GRADUATION_ACCURACY = PACE_ACCURACY_FLOOR;

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

export function startWeakRound(
  _targets: readonly WeakTarget[],
  _targetWpm: number,
  _maxBlocks = WEAK_BLOCKS_PER_ROUND,
): WeakRoundState {
  throw new Error("todo");
}

export function currentWeakTarget(_round: WeakRoundState): WeakTarget | null {
  throw new Error("todo");
}

export function shouldGraduate(
  _afterMedianMs: number | null,
  _accuracy: number,
  _targetWpm: number,
): boolean {
  throw new Error("todo");
}

export function finishWeakBlock(
  _round: WeakRoundState,
  _result: WeakBlockResult,
): WeakRoundState {
  throw new Error("todo");
}

export function summarizeWeakRound(_round: WeakRoundState): WeakNgramResult[] {
  throw new Error("todo");
}

export function weakEvents(_trace: KeyTrace, _meta: WeakEventsMeta): TrainingEvent[] {
  throw new Error("todo");
}
