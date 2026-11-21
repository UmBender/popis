import type { TrainingEvent } from "./event";

export const MIN_BIGRAM_COUNT = 5;

export type BigramStat = {
  readonly bigram: string;
  readonly medianMs: number;
  readonly count: number;
  readonly symbol: boolean;
};

export type CharErrorStat = {
  readonly char: string;
  readonly errors: number;
  readonly total: number;
  readonly errorRate: number;
  readonly symbol: boolean;
};

export function isCodeSymbol(_text: string): boolean {
  throw new Error("todo");
}

export function slowestBigrams(_events: readonly TrainingEvent[], _limit?: number): BigramStat[] {
  throw new Error("todo");
}

export function errorChars(_events: readonly TrainingEvent[], _limit?: number): CharErrorStat[] {
  throw new Error("todo");
}
