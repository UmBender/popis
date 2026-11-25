import type { TrainingEvent } from "../stats/event";
import type { StlItem, StlLevel, StlModel } from "./drill";

export const STL_DURATIONS_S = [30, 60, 120] as const;

export type StlRoundConfig = {
  readonly durationMs: number;
  readonly seed: number;
  readonly level: StlLevel;
};

export type StlItemResult = {
  readonly index: number;
  readonly seed: number;
  readonly level: StlLevel;
  readonly model: StlModel;
  readonly kc: `stl.${StlModel}`;
  readonly lines: readonly string[];
  readonly canonical: string;
  readonly typed: string;
  readonly ok: boolean;
  readonly skipped: boolean;
  readonly reason: string;
  readonly explanation: string;
  readonly timeMs: number;
};

export type StlRound = {
  readonly config: StlRoundConfig;
  readonly startedAt: number | null;
  readonly itemStartedAt: number | null;
  readonly finished: boolean;
  readonly current: StlItem;
  readonly results: readonly StlItemResult[];
  readonly last: StlItemResult | null;
};

export type StlModelStats = {
  readonly model: StlModel;
  readonly total: number;
  readonly correct: number;
  readonly avgTimeMs: number;
};

export type StlRoundStats = {
  readonly correct: number;
  readonly wrong: number;
  readonly skipped: number;
  readonly total: number;
  readonly accuracy: number;
  readonly byModel: readonly StlModelStats[];
  readonly wrongItems: readonly StlItemResult[];
};

export function startStlRound(_config: StlRoundConfig): StlRound {
  throw new Error("todo");
}

export function touchStlRound(_round: StlRound, _now: number): StlRound {
  throw new Error("todo");
}

export function isStlRoundFinished(_round: StlRound): boolean {
  throw new Error("todo");
}

export function stlRemainingMs(_round: StlRound, _now: number): number {
  throw new Error("todo");
}

export function tickStlRound(_round: StlRound, _now: number): StlRound {
  throw new Error("todo");
}

export function submitStlAnswer(_round: StlRound, _text: string, _now: number): StlRound {
  throw new Error("todo");
}

export function skipStlItem(_round: StlRound, _now: number): StlRound {
  throw new Error("todo");
}

export function stlRoundStats(_round: StlRound): StlRoundStats {
  throw new Error("todo");
}

export function stlOutputEvents(_round: Pick<StlRound, "results">, _at: number): TrainingEvent[] {
  throw new Error("todo");
}
