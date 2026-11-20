import type { EditKind, EditTarget } from "./drills/edit";
import type { Key } from "./keys";
import type { VimState } from "./state";

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

export function startEditRound(config: EditRoundConfig): EditRound {
  void config;
  throw new Error("todo");
}

export function pressEditRoundKey(round: EditRound, key: Key, now: number): EditRound {
  void round;
  void key;
  void now;
  throw new Error("todo");
}

export function skipEdit(round: EditRound, now: number): EditRound {
  void round;
  void now;
  throw new Error("todo");
}

/** Ends the round when the time is up. */
export function tickEditRound(round: EditRound, now: number): EditRound {
  void round;
  void now;
  throw new Error("todo");
}

export function isEditRoundFinished(round: EditRound): boolean {
  return round.finished;
}

export function editRemainingMs(round: EditRound, now: number): number {
  void round;
  void now;
  throw new Error("todo");
}

/** Reference keys over keys used, with no ceiling; 0 for a skipped edit. */
export function editEfficiency(result: EditResult): number {
  void result;
  throw new Error("todo");
}

export function editRoundStats(round: Pick<EditRound, "results">): EditRoundStats {
  void round;
  throw new Error("todo");
}
