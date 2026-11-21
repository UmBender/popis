import type { ArithmeticSettings } from "../gen/arithmetic";
import type { EstimationSettings } from "../gen/estimation";
import type { SumsSettings } from "../gen/sums";
import type { TrainingEvent } from "./event";
import { DAY_MS, quartiles } from "./summary";

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

/** Decreasing K factor per Pelánek (2016): `K(n) = K_init / (1 + K_decay * n)`. */
export function kFactor(responses: number): number {
  return ELO_K_INIT / (1 + ELO_K_DECAY * Math.max(0, responses));
}

/** Expected win probability for a learner vs. an item/level rating. */
export function expectedWin(userRating: number, itemRating: number): number {
  return 1 / (1 + 10 ** ((itemRating - userRating) / ELO_SCALE));
}

/** Zero-sum Elo update between learner KC rating and item/level rating. */
export function updateElo(user: EloEntry, item: EloEntry, win: boolean): EloUpdateResult {
  const expected = expectedWin(user.rating, item.rating);
  const k = kFactor(user.count);
  const delta = k * ((win ? 1 : 0) - expected);
  return {
    user: { rating: user.rating + delta, count: user.count + 1 },
    item: { rating: item.rating - delta, count: item.count + 1 },
    deltaUser: delta,
    deltaItem: -delta,
    expected,
    k,
  };
}

/** Median correct response time for `kc` within the last 2 weeks, or null when absent. */
export function kcTargetTimeMs(
  events: readonly TrainingEvent[],
  kc: string,
  now: number,
): number | null {
  const cutoff = now - TARGET_TIME_WINDOW_MS;
  const times = events
    .filter((e) => e.kc === kc && e.ok && e.at >= cutoff && e.at <= now)
    .map((e) => e.timeMs);
  if (times.length === 0) return null;
  return quartiles(times)[1];
}

/** An attempt counts as an Elo win when correct and within the KC target time. */
export function isEloWin(
  event: Pick<TrainingEvent, "ok" | "timeMs">,
  targetTimeMs: number | null,
): boolean {
  return event.ok && (targetTimeMs === null || event.timeMs <= targetTimeMs);
}

/** Monotonic initial ratings for levels 1..N. */
export function defaultLevelRatings(levelCount: number, base = 700, step = 100): number[] {
  return Array.from({ length: levelCount }, (_, idx) => base + idx * step);
}

/**
 * Picks the next level within `[current - 1, current + 1]` whose expected win
 * probability is closest to `targetAccuracy` (default 85%, clamped 70%–95%).
 */
export function chooseNextLevel({
  currentLevel,
  userRating,
  levelRatings,
  targetAccuracy = DEFAULT_TARGET_ACCURACY,
}: {
  readonly currentLevel: number;
  readonly userRating: number;
  readonly levelRatings: readonly number[];
  readonly targetAccuracy?: number;
}): number {
  const maxLevel = levelRatings.length;
  const target = Math.min(MAX_TARGET_ACCURACY, Math.max(MIN_TARGET_ACCURACY, targetAccuracy));
  const cur = Math.min(maxLevel, Math.max(1, Math.round(currentLevel)));
  const lo = Math.max(1, cur - 1);
  const hi = Math.min(maxLevel, cur + 1);
  let bestLevel = cur;
  let bestErr = Infinity;
  for (let level = lo; level <= hi; level++) {
    const p = expectedWin(userRating, levelRatings[level - 1] as number);
    const err = Math.abs(p - target);
    if (err < bestErr) {
      bestErr = err;
      bestLevel = level;
    }
  }
  return bestLevel;
}

/** Replays chronological events into per-KC user ratings and per-config item ratings. */
export function replayElo(events: readonly TrainingEvent[], now: number): EloState {
  const sorted = [...events].sort((a, b) => a.at - b.at || a.extra.i - b.extra.i);
  const targetByKc = new Map<string, number | null>();
  const users: Record<string, EloEntry> = {};
  const items: Record<string, EloEntry> = {};

  for (const event of sorted) {
    if (!targetByKc.has(event.kc)) {
      targetByKc.set(event.kc, kcTargetTimeMs(sorted, event.kc, now));
    }
    const targetMs = targetByKc.get(event.kc) ?? null;
    const itemKey = `${event.drill}:${event.config}`;
    const userEntry = users[event.kc] ?? { rating: INITIAL_ELO, count: 0 };
    const itemEntry = items[itemKey] ?? { rating: INITIAL_ELO, count: 0 };
    const next = updateElo(userEntry, itemEntry, isEloWin(event, targetMs));
    users[event.kc] = next.user;
    items[itemKey] = next.item;
  }

  return { users, items };
}

export function drillLevelCount(drill: AutoLevelDrill): number {
  switch (drill) {
    case "vim-motion":
      return 7;
    case "arithmetic":
      return ARITHMETIC_LEVELS.length;
    case "estimation":
      return ESTIMATION_LEVELS.length;
    case "sums":
      return SUMS_LEVELS.length;
  }
}

function clampLevel(level: number, max: number): number {
  return Math.min(max, Math.max(1, Math.round(level)));
}

export function arithmeticForLevel(
  level: number,
  current: ArithmeticSettings,
): ArithmeticSettings {
  const preset = ARITHMETIC_LEVELS[clampLevel(level, ARITHMETIC_LEVELS.length) - 1]!;
  return { ...current, ...preset };
}

export function estimationForLevel(level: number): EstimationSettings {
  return ESTIMATION_LEVELS[clampLevel(level, ESTIMATION_LEVELS.length) - 1]!;
}

export function sumsForLevel(level: number): SumsSettings {
  return SUMS_LEVELS[clampLevel(level, SUMS_LEVELS.length) - 1]!;
}

export function levelOfArithmetic(settings: ArithmeticSettings): number {
  const idx = ARITHMETIC_LEVELS.findIndex((p) => p.addLeft.max >= settings.addLeft.max);
  return idx >= 0 ? idx + 1 : ARITHMETIC_LEVELS.length;
}

export function levelOfEstimation(settings: EstimationSettings): number {
  return clampLevel(settings.kinds.length, ESTIMATION_LEVELS.length);
}

export function levelOfSums(settings: SumsSettings): number {
  return clampLevel(settings.kinds.length, SUMS_LEVELS.length);
}
