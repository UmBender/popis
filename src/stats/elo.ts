import type { ArithmeticSettings } from "../gen/arithmetic";
import type { EstimationSettings } from "../gen/estimation";
import type { SumsSettings } from "../gen/sums";
import type { TrainingEvent } from "./event";
import { DAY_MS } from "./summary";

export const INITIAL_ELO = 1000;
export const ELO_SCALE = 400;
export const ELO_K_INIT = 64;
export const ELO_K_DECAY = 0.05;
export const DEFAULT_TARGET_ACCURACY = 0.85;
export const MIN_TARGET_ACCURACY = 0.7;
export const MAX_TARGET_ACCURACY = 0.95;
export const TARGET_ACCURACY_STEPS = [0.7, 0.75, 0.8, 0.85, 0.9, 0.95] as const;
export const TARGET_TIME_WINDOW_MS = 14 * DAY_MS;

export type AutoLevelDrill = "vim-motion" | "arithmetic" | "estimation" | "sums";

export const AUTO_LEVEL_DRILLS: readonly AutoLevelDrill[] = [
  "vim-motion",
  "arithmetic",
  "estimation",
  "sums",
];

export type EloEntry = {
  readonly rating: number;
  readonly count: number;
};

export type EloState = {
  readonly users: Readonly<Record<string, EloEntry>>;
  readonly items: Readonly<Record<string, EloEntry>>;
};

export type EloUpdateResult = {
  readonly user: EloEntry;
  readonly item: EloEntry;
  readonly deltaUser: number;
  readonly deltaItem: number;
  readonly expected: number;
  readonly k: number;
};

export const ARITHMETIC_LEVELS: readonly Pick<
  ArithmeticSettings,
  "addLeft" | "addRight" | "mulLeft" | "mulRight"
>[] = [
  {
    addLeft: { min: 2, max: 10 },
    addRight: { min: 2, max: 10 },
    mulLeft: { min: 2, max: 5 },
    mulRight: { min: 2, max: 12 },
  },
  {
    addLeft: { min: 2, max: 25 },
    addRight: { min: 2, max: 25 },
    mulLeft: { min: 2, max: 9 },
    mulRight: { min: 2, max: 25 },
  },
  {
    addLeft: { min: 2, max: 50 },
    addRight: { min: 2, max: 50 },
    mulLeft: { min: 2, max: 12 },
    mulRight: { min: 2, max: 50 },
  },
  {
    addLeft: { min: 2, max: 100 },
    addRight: { min: 2, max: 100 },
    mulLeft: { min: 2, max: 12 },
    mulRight: { min: 2, max: 100 },
  },
  {
    addLeft: { min: 10, max: 250 },
    addRight: { min: 10, max: 250 },
    mulLeft: { min: 3, max: 25 },
    mulRight: { min: 10, max: 200 },
  },
];

export const ESTIMATION_LEVELS: readonly EstimationSettings[] = [
  { kinds: ["complexity"] },
  { kinds: ["complexity", "overflow"] },
  { kinds: ["complexity", "magnitude", "overflow"] },
];

export const SUMS_LEVELS: readonly SumsSettings[] = [{ kinds: ["sum"] }, { kinds: ["sum", "loop"] }];

export function kFactor(_responses: number): number {
  throw new Error("todo");
}

export function expectedWin(_userRating: number, _itemRating: number): number {
  throw new Error("todo");
}

export function updateElo(_user: EloEntry, _item: EloEntry, _win: boolean): EloUpdateResult {
  throw new Error("todo");
}

export function kcTargetTimeMs(
  _events: readonly TrainingEvent[],
  _kc: string,
  _now: number,
): number | null {
  throw new Error("todo");
}

export function isEloWin(
  _event: Pick<TrainingEvent, "ok" | "timeMs">,
  _targetTimeMs: number | null,
): boolean {
  throw new Error("todo");
}

export function defaultLevelRatings(_levelCount: number, _base?: number, _step?: number): number[] {
  throw new Error("todo");
}

export function chooseNextLevel(_params: {
  readonly currentLevel: number;
  readonly userRating: number;
  readonly levelRatings: readonly number[];
  readonly targetAccuracy?: number;
}): number {
  throw new Error("todo");
}

export function replayElo(_events: readonly TrainingEvent[], _now: number): EloState {
  throw new Error("todo");
}

export function drillLevelCount(_drill: AutoLevelDrill): number {
  throw new Error("todo");
}

export function arithmeticForLevel(
  _level: number,
  _current: ArithmeticSettings,
): ArithmeticSettings {
  throw new Error("todo");
}

export function estimationForLevel(_level: number): EstimationSettings {
  throw new Error("todo");
}

export function sumsForLevel(_level: number): SumsSettings {
  throw new Error("todo");
}

export function levelOfArithmetic(_settings: ArithmeticSettings): number {
  throw new Error("todo");
}

export function levelOfEstimation(_settings: EstimationSettings): number {
  throw new Error("todo");
}

export function levelOfSums(_settings: SumsSettings): number {
  throw new Error("todo");
}
