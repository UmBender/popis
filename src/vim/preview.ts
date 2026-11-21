import type { TrainingEvent } from "../stats/event";
import type { EditTarget } from "./drills/edit";
import type { Key } from "./keys";
import type { Level } from "./levels";
import type { Pos, VimState } from "./state";

export const PREVIEW_MODES = ["off", "always", "stuck", "auto"] as const;
export type PreviewMode = (typeof PREVIEW_MODES)[number];

export const PREVIEW_MODE_LABELS: Readonly<Record<PreviewMode, string>> = {
  off: "Desligada",
  always: "Sempre",
  stuck: "Ao travar",
  auto: "Automática",
};

/** Efficiency threshold (Wilson et al., 2019) above which Auto fades to Stuck. */
export const AUTO_EFFICIENCY_THRESHOLD = 0.85;
/** Number of recent targets per command required before Auto fades to Stuck. */
export const AUTO_WINDOW = 20;
/** Extra keys beyond optimal that trigger Stuck preview. */
export const STUCK_EXTRA_KEYS = 2;
/** Idle time in ms without progress that triggers Stuck preview. */
export const STUCK_IDLE_MS = 5000;

export type PreviewBlock = {
  readonly text: string;
  readonly keys: readonly Key[];
  readonly helpKey: string;
  readonly commandKey: string;
  readonly description: string | null;
  readonly lessonId: string | null;
  readonly startKeyIndex: number;
  readonly endKeyIndex: number;
};

export type CommandSample = {
  readonly solution: string;
  readonly efficiency: number;
};

export type PreviewVisibilityInput = {
  readonly mode: PreviewMode;
  readonly solution: string;
  readonly minimum: number;
  readonly keysTyped: number;
  readonly idleMs: number;
  readonly peeked: boolean;
  readonly history: readonly CommandSample[];
};

export type AssistedSplit = {
  readonly withPreview: number;
  readonly withoutPreview: number;
  readonly anyAssisted: boolean;
};

export function parseSolutionBlocks(_solution: string): readonly PreviewBlock[] {
  throw new Error("todo");
}

export function commandKeysOf(_solution: string): readonly string[] {
  throw new Error("todo");
}

export function commandEfficiencies(
  _history: readonly CommandSample[],
  _windowSize: number = AUTO_WINDOW,
): ReadonlyMap<string, { readonly count: number; readonly mean: number }> {
  throw new Error("todo");
}

export function shouldShowPreview(_input: PreviewVisibilityInput): boolean {
  throw new Error("todo");
}

export function motionWaypoints(
  _state: VimState,
  _blocks: readonly PreviewBlock[],
  _startBlockIndex: number,
  _target: Pos,
  _level: Level,
): readonly Pos[] {
  throw new Error("todo");
}

export function recalculateEditPreview(_state: VimState, _target: EditTarget): string {
  throw new Error("todo");
}

export function assistedSplit(
  _results: readonly { readonly skipped: boolean; readonly assisted?: boolean }[],
): AssistedSplit {
  throw new Error("todo");
}

export function eventsToSamples(
  _events: readonly TrainingEvent[],
  _drill: "vim.motion" | "vim.edit",
): CommandSample[] {
  throw new Error("todo");
}
