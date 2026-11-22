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

export type PaceUnit = {
  readonly ok: boolean;
  readonly chars: number;
  readonly timeMs: number;
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

/** Target inter-character interval in ms for `targetWpm` (`60000 / (5 * targetWpm)`). */
export function targetIntervalMs(_targetWpm: number): number {
  throw new Error("todo");
}

/** Median of the last 10 WPMs (rounded, >= MIN_TARGET_WPM), or 30 WPM without history. */
export function initialTargetWpm(_recentWpms: readonly number[]): number {
  throw new Error("todo");
}

/** Typeable character count of each line in `text` (excluding auto-indent on lines 2+). */
export function codeLineLengths(_text: string): number[] {
  throw new Error("todo");
}

/** Whether a single word or line is on pace: right, positive chars, and speed >= targetWpm. */
export function isUnitOnPace(_unit: PaceUnit, _targetWpm: number): boolean {
  throw new Error("todo");
}

/** Next target WPM after a round under the 85% rule with ±5 pp band and 95% accuracy floor. */
export function nextTargetWpm(_input: PaceAdjustmentInput): number {
  throw new Error("todo");
}

/** Summarises a finished round's unit on-pace flags and computes the next target WPM. */
export function evaluatePaceRound(
  _onPaceUnits: readonly boolean[],
  _target: number,
  _accuracy: number,
  _goal?: number,
): PaceRoundSummary {
  throw new Error("todo");
}

/** Ghost caret character index in `text` after `elapsedMs` at `targetWpm`, skipping auto-indent. */
export function ghostCodePosition(_text: string, _elapsedMs: number, _targetWpm: number): number {
  throw new Error("todo");
}

/** Ghost caret position (`word`, `letter`) in `words` after `elapsedMs` at `targetWpm`, or null past the end. */
export function ghostTextPosition(
  _words: readonly string[],
  _elapsedMs: number,
  _targetWpm: number,
): GhostTextPos | null {
  throw new Error("todo");
}
