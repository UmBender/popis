/** Default share of units on pace to aim for (85% rule, ADR-T24-1, ADR-T29-1). */
export const DEFAULT_PACE_GOAL = 0.85;
export const MIN_PACE_GOAL = 0.7;
export const MAX_PACE_GOAL = 0.95;
export const PACE_GOAL_STEPS = [0.7, 0.75, 0.8, 0.85, 0.9, 0.95] as const;

/** Deadband around the goal in percentage points (as a fraction). */
export const PACE_BAND = 0.05;
/** WPM step per round adjustment. */
export const PACE_STEP_WPM = 2;
/** Minimum round accuracy required before the target can rise. */
export const PACE_ACCURACY_FLOOR = 0.95;
/** Initial target WPM when a configuration has no prior history. */
export const DEFAULT_INITIAL_TARGET_WPM = 30;
/** Positive lower bound so target WPM never hits zero. */
export const MIN_TARGET_WPM = 4;
/** Number of recent rounds whose median sets the initial target. */
export const INITIAL_HISTORY_WINDOW = 10;
/** A rising target this far below the round's goal speed jumps to it (ADR-T52-1). */
export const CATCH_UP_GAP_WPM = 10;

const EPS = 1e-9;

export type PaceUnit = {
  readonly ok: boolean;
  readonly chars: number;
  readonly timeMs: number;
};

/** One word or line of a finished round, as the target rule counts it (ADR-T52-1). */
export type PaceRoundUnit = PaceUnit & {
  /** False for the last word cut by the end of a timed round. */
  readonly complete: boolean;
};

export type PaceAdjustmentInput = {
  readonly target: number;
  readonly onPaceShare: number;
  readonly accuracy: number;
  readonly goal?: number;
};

export type PaceRoundSummary = {
  readonly target: number;
  readonly nextTarget: number;
  readonly onPaceCount: number;
  readonly totalUnits: number;
  readonly onPaceShare: number;
};

export type GhostTextPos = {
  readonly word: number;
  readonly letter: number;
};

/** Leading spaces of a line, matching auto-indent in `src/typing/engine.ts`. */
function leadingSpaces(text: string): number {
  return text.search(/[^ ]|$/);
}

/** Target inter-character interval in ms for `targetWpm` (`60000 / (5 * targetWpm)`). */
export function targetIntervalMs(targetWpm: number): number {
  return 60_000 / (5 * targetWpm);
}

/** Median of the last 10 WPMs (rounded, >= MIN_TARGET_WPM), or 30 WPM without history. */
export function initialTargetWpm(recentWpms: readonly number[]): number {
  if (recentWpms.length === 0) return DEFAULT_INITIAL_TARGET_WPM;
  const sorted = recentWpms.slice(-INITIAL_HISTORY_WINDOW).sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 1
      ? (sorted[mid] as number)
      : ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2;
  return Math.max(MIN_TARGET_WPM, Math.round(median));
}

/** Typeable character count of each line in `text` (excluding auto-indent on lines 2+). */
export function codeLineLengths(text: string): number[] {
  const lines = text.split("\n");
  return lines.map(
    (line, i) =>
      (i === 0 ? line.length : line.length - leadingSpaces(line)) + (i < lines.length - 1 ? 1 : 0),
  );
}

/** Whether a single word or line is on pace: right, positive chars, and speed >= targetWpm. */
export function isUnitOnPace(unit: PaceUnit, targetWpm: number): boolean {
  if (!unit.ok || unit.chars <= 0) return false;
  if (unit.timeMs <= 0) return true;
  return unit.chars * 12_000 >= targetWpm * unit.timeMs;
}

/** Next target WPM after a round under the 85% rule with ±5 pp band and 95% accuracy floor. */
export function nextTargetWpm({
  target,
  onPaceShare,
  accuracy,
  goal = DEFAULT_PACE_GOAL,
}: PaceAdjustmentInput): number {
  if (onPaceShare >= goal + PACE_BAND - EPS && accuracy >= PACE_ACCURACY_FLOOR - EPS) {
    return target + PACE_STEP_WPM;
  }
  if (onPaceShare <= goal - PACE_BAND + EPS) {
    return target - PACE_STEP_WPM >= MIN_TARGET_WPM ? target - PACE_STEP_WPM : target;
  }
  return target;
}

/**
 * Highest whole WPM that at least `goal` of the right, complete units
 * reached, or null when no unit counts or that speed is unbounded.
 */
export function goalSpeedWpm(units: readonly PaceRoundUnit[], goal: number): number | null {
  void units;
  void goal;
  throw new Error("todo");
}

/**
 * Summarises a finished round over its right, complete units and computes
 * the next target WPM, catching up when far below the goal speed (ADR-T52-1).
 */
export function evaluatePaceRound(
  units: readonly PaceRoundUnit[],
  target: number,
  accuracy: number,
  goal = DEFAULT_PACE_GOAL,
): PaceRoundSummary {
  void units;
  void target;
  void accuracy;
  void goal;
  throw new Error("todo");
}

/** Typeable characters advanced in `elapsedMs` at `targetWpm` (`targetWpm * 5 / 60` chars/s). */
function ghostSteps(elapsedMs: number, targetWpm: number): number {
  return Math.floor((Math.max(0, elapsedMs) * targetWpm) / 12_000);
}

/** Ghost caret character index in `text` after `elapsedMs` at `targetWpm`, skipping auto-indent. */
export function ghostCodePosition(text: string, elapsedMs: number, targetWpm: number): number {
  const steps = ghostSteps(elapsedMs, targetWpm);
  let seen = 0;
  for (let i = 0; i < text.length; i++) {
    if (seen === steps) return i;
    seen++;
    if (text[i] === "\n") {
      while (i + 1 < text.length && text[i + 1] === " ") i++;
    }
  }
  return text.length;
}

/** Ghost caret position (`word`, `letter`) in `words` after `elapsedMs` at `targetWpm`, or null past the end. */
export function ghostTextPosition(
  words: readonly string[],
  elapsedMs: number,
  targetWpm: number,
): GhostTextPos | null {
  let remaining = ghostSteps(elapsedMs, targetWpm);
  for (let w = 0; w < words.length; w++) {
    const length = [...(words[w] as string)].length;
    const span = w === words.length - 1 ? length : length + 1;
    if (remaining < span) return { word: w, letter: remaining };
    remaining -= span;
  }
  return null;
}
