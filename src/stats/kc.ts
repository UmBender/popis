import type { TrainingEvent } from "./event";

export const MAX_OPPORTUNITIES = 20;
export const MIN_CV_HITS = 10;
export const CV_STABLE_THRESHOLD = 0.35;

export type OpportunityPoint = {
  readonly opportunity: number;
  readonly errorRate: number;
  readonly medianMs: number;
  readonly count: number;
};

export type KcStat = {
  readonly kc: string;
  readonly opportunities: number;
  readonly accuracy: number;
  readonly medianMs: number;
  readonly hitsPerMin: number;
  readonly bis: number;
  readonly cv: number | null;
  readonly stability: "estável" | "irregular" | null;
};

export function kcCurve(
  _events: readonly TrainingEvent[],
  _maxOpportunities?: number,
): OpportunityPoint[] {
  throw new Error("todo");
}

export function kcStats(_events: readonly TrainingEvent[]): KcStat[] {
  throw new Error("todo");
}
