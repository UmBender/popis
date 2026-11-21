import { generateEdit, type EditKind, type EditTarget } from "./drills/edit";
import { pressEditKey } from "./edit";
import type { Key } from "./keys";
import { createState, type VimState } from "./state";

export type EditRoundConfig = {
  readonly durationMs: number;
  readonly seed: number;
  readonly kinds: readonly EditKind[];
};

/** What happened to one edit. */
export type EditResult = {
  readonly index: number;
  readonly seed: number;
  readonly kind: EditKind;
  readonly snippetId: string;
  /** Keys typed on the edit. */
  readonly keys: number;
  readonly referenceKeys: number;
  /** The reference solution in Vim notation. */
  readonly reference: string;
  readonly timeMs: number;
  readonly skipped: boolean;
  /** Whether the optimal preview was visible at any point during this edit (T21 AC-4). */
  readonly assisted?: boolean;
};

export type EditRound = {
  readonly config: EditRoundConfig;
  readonly target: EditTarget;
  readonly vim: VimState;
  /** Keys typed on the current edit. */
  readonly keys: number;
  /** When the first key was typed; null before. */
  readonly startedAt: number | null;
  /** When the current edit appeared (or the first key came). */
  readonly targetStartedAt: number | null;
  /** When the current edit started or the last key was typed. */
  readonly lastActivityAt: number | null;
  /** When the round was paused, or null. */
  readonly pausedAt: number | null;
  /** Whether the optimal preview was shown on the current edit. */
  readonly assisted: boolean;
  readonly results: readonly EditResult[];
  /** The last finished edit. */
  readonly last: EditResult | null;
  /** True when the last edit ended inside insert mode: the next Esc closes it. */
  readonly closingEsc: boolean;
  readonly finished: boolean;
};

export type EditRoundStats = {
  readonly reached: number;
  readonly skipped: number;
  /** Mean efficiency of the reached edits; above 1 beats the reference. */
  readonly efficiency: number;
  /** Up to 3 reached edits with the worst efficiency first. */
  readonly worst: readonly EditResult[];
};

const WORST_COUNT = 3;

function showEdit(config: EditRoundConfig, index: number): Pick<EditRound, "target" | "vim"> {
  const target = generateEdit(config.seed, index, config.kinds);
  return { target, vim: createState(target.lines, target.start) };
}

export function startEditRound(config: EditRoundConfig): EditRound {
  return {
    config,
    ...showEdit(config, 0),
    keys: 0,
    startedAt: null,
    targetStartedAt: null,
    lastActivityAt: null,
    pausedAt: null,
    assisted: false,
    results: [],
    last: null,
    closingEsc: false,
    finished: false,
  };
}

const timeIsUp = (round: EditRound, now: number): boolean =>
  round.startedAt !== null && (round.pausedAt ?? now) >= round.startedAt + round.config.durationMs;

const sameLines = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((line, i) => line === b[i]);

/** Records the current edit as done and shows the next one. */
function finishEdit(
  round: EditRound,
  now: number,
  keys: number,
  skipped: boolean,
  closingEsc: boolean,
): EditRound {
  const { target } = round;
  const result: EditResult = {
    index: target.index,
    seed: target.seed,
    kind: target.kind,
    snippetId: target.snippetId,
    keys,
    referenceKeys: target.referenceKeys,
    reference: target.reference,
    timeMs: now - (round.targetStartedAt ?? now),
    skipped,
    assisted: round.assisted,
  };
  return {
    ...round,
    ...showEdit(round.config, target.index + 1),
    keys: 0,
    startedAt: round.startedAt ?? now,
    targetStartedAt: now,
    lastActivityAt: now,
    assisted: false,
    results: [...round.results, result],
    last: result,
    closingEsc,
  };
}

export function pressEditRoundKey(round: EditRound, key: Key, now: number): EditRound {
  if (round.finished || round.pausedAt !== null) return round;
  if (timeIsUp(round, now)) return { ...round, finished: true };
  const started = {
    startedAt: round.startedAt ?? now,
    targetStartedAt: round.targetStartedAt ?? now,
    lastActivityAt: now,
  };
  const previous = round.results.at(-1);
  if (round.closingEsc && key === "<Esc>" && previous !== undefined) {
    // The Esc that closes the insertion belongs to the edit just finished.
    const closed = { ...previous, keys: previous.keys + 1 };
    return {
      ...round,
      ...started,
      results: [...round.results.slice(0, -1), closed],
      last: closed,
      closingEsc: false,
    };
  }
  const vim = pressEditKey(round.vim, key);
  const keys = round.keys + 1;
  if (sameLines(vim.lines, round.target.after)) {
    return finishEdit({ ...round, ...started }, now, keys, false, vim.mode === "insert");
  }
  return { ...round, ...started, vim, keys, closingEsc: false };
}

export function skipEdit(round: EditRound, now: number): EditRound {
  if (round.finished || round.pausedAt !== null) return round;
  if (timeIsUp(round, now)) return { ...round, finished: true };
  return finishEdit(round, now, round.keys, true, false);
}

/** Ends the round when the time is up. */
export function tickEditRound(round: EditRound, now: number): EditRound {
  if (round.finished || round.pausedAt !== null) return round;
  return timeIsUp(round, now) ? { ...round, finished: true } : round;
}

export function isEditRoundFinished(round: EditRound): boolean {
  return round.finished;
}

export function editRemainingMs(round: EditRound, now: number): number {
  if (round.finished) return 0;
  if (round.startedAt === null) return round.config.durationMs;
  const effectiveNow = round.pausedAt ?? now;
  return Math.max(0, round.startedAt + round.config.durationMs - effectiveNow);
}

/** Reference keys over keys used, with no ceiling; 0 for a skipped edit. */
export function editEfficiency(result: EditResult): number {
  if (result.skipped || result.keys === 0) return 0;
  return result.referenceKeys / result.keys;
}

export function editRoundStats(round: Pick<EditRound, "results">): EditRoundStats {
  const reached = round.results.filter((r) => !r.skipped);
  const total = reached.reduce((sum, r) => sum + editEfficiency(r), 0);
  return {
    reached: reached.length,
    skipped: round.results.length - reached.length,
    efficiency: reached.length === 0 ? 0 : total / reached.length,
    worst: [...reached].sort((a, b) => editEfficiency(a) - editEfficiency(b)).slice(0, WORST_COUNT),
  };
}

export function markEditAssisted(round: EditRound): EditRound {
  return round.finished || round.assisted ? round : { ...round, assisted: true };
}

export function pauseEditRound(round: EditRound, now: number): EditRound {
  return round.finished || round.pausedAt !== null ? round : { ...round, pausedAt: now };
}

export function resumeEditRound(round: EditRound, now: number): EditRound {
  if (round.pausedAt === null) return round;
  const pausedFor = Math.max(0, now - round.pausedAt);
  return {
    ...round,
    pausedAt: null,
    startedAt: round.startedAt !== null ? round.startedAt + pausedFor : null,
    targetStartedAt: round.targetStartedAt !== null ? round.targetStartedAt + pausedFor : null,
    lastActivityAt: round.lastActivityAt !== null ? round.lastActivityAt + pausedFor : null,
  };
}

export function editIdleMs(round: EditRound, now: number): number {
  if (round.finished || round.startedAt === null) return 0;
  const effectiveNow = round.pausedAt ?? now;
  return Math.max(0, effectiveNow - (round.lastActivityAt as number));
}
