import type { TrainingEvent } from "../stats/event";
import type { WaClass } from "./classes";
import type { WaAnswer, WaItem } from "./drill";

export const WA_ROUND_SIZE = 5;

export type WaRoundConfig = {
  readonly seed: number;
  readonly classes: readonly WaClass[];
  readonly count?: number;
};

export type WaResolvedRoundConfig = {
  readonly seed: number;
  readonly classes: readonly WaClass[];
  readonly count: number;
};

export type WaItemResult = {
  readonly index: number;
  readonly seed: number;
  readonly caseId: string;
  readonly bugClass: WaClass;
  readonly kc: `wa.${WaClass}`;
  readonly expectedLine: number;
  readonly selectedLine: number | null;
  readonly expectedClass: WaClass;
  readonly selectedClass: WaClass | null;
  readonly ok: boolean;
  readonly lineOk: boolean;
  readonly classOk: boolean;
  readonly skipped: boolean;
  readonly explanation: string;
  readonly timeMs: number;
};

export type WaRound = {
  readonly config: WaResolvedRoundConfig;
  readonly startedAt: number | null;
  readonly itemStartedAt: number | null;
  readonly finishedAt: number | null;
  readonly finished: boolean;
  readonly current: WaItem;
  readonly reviewing: WaItemResult | null;
  readonly results: readonly WaItemResult[];
  readonly last: WaItemResult | null;
};

export type WaClassStats = {
  readonly bugClass: WaClass;
  readonly total: number;
  readonly correct: number;
  readonly avgTimeMs: number;
};

export type WaRoundStats = {
  readonly correct: number;
  readonly wrong: number;
  readonly skipped: number;
  readonly total: number;
  readonly accuracy: number;
  readonly avgTimeMs: number;
  readonly byClass: readonly WaClassStats[];
  readonly wrongItems: readonly WaItemResult[];
};

export function startWaRound(_config: WaRoundConfig): WaRound {
  throw new Error("todo");
}

export function touchWaRound(_round: WaRound, _now: number): WaRound {
  throw new Error("todo");
}

export function waElapsedMs(_round: WaRound, _now: number): number {
  throw new Error("todo");
}

export function isWaRoundFinished(_round: WaRound): boolean {
  throw new Error("todo");
}

export function submitWaAnswer(_round: WaRound, _answer: WaAnswer, _now: number): WaRound {
  throw new Error("todo");
}

export function advanceAfterReview(_round: WaRound, _now: number): WaRound {
  throw new Error("todo");
}

export function skipWaItem(_round: WaRound, _now: number): WaRound {
  throw new Error("todo");
}

export function waRoundStats(_round: WaRound): WaRoundStats {
  throw new Error("todo");
}

export function waRoundEvents(_round: Pick<WaRound, "results">, _at: number): TrainingEvent[] {
  throw new Error("todo");
}
