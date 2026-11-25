import type { TrainingEvent } from "../stats/event";
import type { ShellDrillItem, ShellDrillKind } from "./drill";

export const SHELL_DURATIONS_S = [30, 60, 120] as const;

export type ShellRoundConfig = {
  readonly durationMs: number;
  readonly seed: number;
  readonly kinds: readonly ShellDrillKind[];
};

export type ShellItemResult = {
  readonly index: number;
  readonly seed: number;
  readonly kind: ShellDrillKind;
  readonly kc: `shell.${ShellDrillKind}`;
  readonly prompt: string;
  readonly canonical: string;
  readonly typed: string;
  readonly ok: boolean;
  readonly skipped: boolean;
  readonly reason: string;
  readonly timeMs: number;
};

export type ShellRound = {
  readonly config: ShellRoundConfig;
  readonly startedAt: number | null;
  readonly itemStartedAt: number | null;
  readonly finished: boolean;
  readonly current: ShellDrillItem;
  readonly results: readonly ShellItemResult[];
  readonly last: ShellItemResult | null;
};

export type ShellKindStats = {
  readonly kind: ShellDrillKind;
  readonly total: number;
  readonly correct: number;
  readonly avgTimeMs: number;
};

export type ShellRoundStats = {
  readonly correct: number;
  readonly wrong: number;
  readonly skipped: number;
  readonly total: number;
  readonly accuracy: number;
  readonly byKind: readonly ShellKindStats[];
  readonly wrongItems: readonly ShellItemResult[];
};

export function startShellRound(_config: ShellRoundConfig): ShellRound {
  throw new Error("todo");
}

export function touchShellRound(_round: ShellRound, _now: number): ShellRound {
  throw new Error("todo");
}

export function isShellRoundFinished(_round: ShellRound): boolean {
  throw new Error("todo");
}

export function shellRemainingMs(_round: ShellRound, _now: number): number {
  throw new Error("todo");
}

export function tickShellRound(_round: ShellRound, _now: number): ShellRound {
  throw new Error("todo");
}

export function submitShellCommand(_round: ShellRound, _text: string, _now: number): ShellRound {
  throw new Error("todo");
}

export function skipShellItem(_round: ShellRound, _now: number): ShellRound {
  throw new Error("todo");
}

export function shellRoundStats(_round: ShellRound): ShellRoundStats {
  throw new Error("todo");
}

export function shellCommandEvents(
  _round: Pick<ShellRound, "results">,
  _at: number,
): TrainingEvent[] {
  throw new Error("todo");
}
