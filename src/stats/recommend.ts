import type { Mode } from "../modes";
import type { DailyMode, DailySessionRecord } from "../storage/adaptive";
import type { ReviewCard } from "../storage/review";
import type { EloState } from "./elo";
import type { TrainingEvent } from "./event";
import type { KcStat } from "./kc";
import type { Plateau } from "./learning";
import type { DrillProgress } from "./progress";
import { DAY_MS } from "./summary";

export const PLATEAU_RECOMMEND_MS = 14 * DAY_MS;
export const HIGH_ACCURACY_THRESHOLD = 0.97;
export const LOW_ACCURACY_THRESHOLD = 0.7;
export const MIN_ACCURACY_SAMPLE = 5;
export const MIN_HIGH_ACCURACY_SAMPLE = 10;
export const STALLED_OPPORTUNITIES = 20;

export type RecommendationKind = "plateau" | "high-accuracy" | "low-accuracy" | "stalled-kc";

export type Recommendation = {
  readonly kind: RecommendationKind;
  readonly drillId: string;
  readonly kc?: string;
  readonly lessonId?: string;
  readonly message: string;
};

export type RecommendationInput = {
  readonly drillId: string;
  readonly isVim?: boolean;
  readonly plateau: Plateau | null;
  readonly events: readonly TrainingEvent[];
  readonly kcs: readonly KcStat[];
  readonly now: number;
  readonly findLesson?: (kc: string) => string | undefined;
};

export type DailyBlock = {
  readonly id: string;
  readonly kind: "review" | "kc";
  readonly title: string;
  readonly reason: string;
  readonly drill: "review" | Mode | "vim-motion" | "vim-edit";
  readonly kc: string | null;
  readonly level: number | null;
  readonly durationS: number;
};

export type DailyPlan = {
  readonly mode: DailyMode;
  readonly estimatedMinutes: number;
  readonly blocks: readonly DailyBlock[];
};

export type ModeExperimentStats = {
  readonly sessions: number;
  readonly weeks: number;
  readonly meanAccuracy: number;
  readonly meanHitsPerMin: number;
  readonly gainHitsPerMin: number;
};

export type DailyExperimentSummary = {
  readonly interleaved: ModeExperimentStats | null;
  readonly blocked: ModeExperimentStats | null;
};

export function isKcStalled(_events: readonly TrainingEvent[], _kc: string): boolean {
  throw new Error("todo");
}

export function recommendForDrill(_input: RecommendationInput): Recommendation[] {
  throw new Error("todo");
}

export function recommendAll(
  _drills: readonly DrillProgress[],
  _allEvents: readonly TrainingEvent[],
  _now: number,
  _findLesson?: (kc: string) => string | undefined,
): Readonly<Record<string, readonly Recommendation[]>> {
  throw new Error("todo");
}

export function buildDailyPlan(_input: {
  readonly dueCards: readonly ReviewCard[];
  readonly events: readonly TrainingEvent[];
  readonly elo: EloState;
  readonly mode: DailyMode;
  readonly targetAccuracy?: number;
  readonly labelOfKc?: (kc: string) => string;
}): DailyPlan {
  throw new Error("todo");
}

export function compareDailyModes(
  _sessions: readonly DailySessionRecord[],
): DailyExperimentSummary {
  throw new Error("todo");
}
