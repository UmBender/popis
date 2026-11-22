import type { TrainingEvent } from "../stats/event";
import type { GdbCmdKind, GdbCommandItem } from "./cmd-drill";

export const GDB_DURATIONS_S = [30, 60, 120] as const;

export type GdbRoundConfig = {
  readonly durationMs: number;
  readonly seed: number;
  readonly kinds: readonly GdbCmdKind[];
};

export type GdbItemResult = {
  readonly index: number;
  readonly seed: number;
  readonly kind: GdbCmdKind;
  readonly kc: `gdb.cmd.${GdbCmdKind}`;
  readonly prompt: string;
  readonly canonical: string;
  readonly typed: string;
  readonly ok: boolean;
  readonly skipped: boolean;
  readonly reason: string;
  readonly timeMs: number;
};

export type GdbRound = {
  readonly config: GdbRoundConfig;
  readonly startedAt: number | null;
  readonly itemStartedAt: number | null;
  readonly finished: boolean;
  readonly current: GdbCommandItem;
  readonly results: readonly GdbItemResult[];
  readonly last: GdbItemResult | null;
};

export type GdbKindStats = {
  readonly kind: GdbCmdKind;
  readonly total: number;
  readonly correct: number;
  readonly avgTimeMs: number;
};

export type GdbRoundStats = {
  readonly correct: number;
  readonly wrong: number;
  readonly skipped: number;
  readonly total: number;
  readonly accuracy: number;
  readonly byKind: readonly GdbKindStats[];
  readonly wrongItems: readonly GdbItemResult[];
};

export function startGdbRound(_config: GdbRoundConfig): GdbRound {
  throw new Error("todo");
}

export function touchGdbRound(_round: GdbRound, _now: number): GdbRound {
  throw new Error("todo");
}

export function submitGdbCommand(_round: GdbRound, _text: string, _now: number): GdbRound {
  throw new Error("todo");
}

export function skipGdbItem(_round: GdbRound, _now: number): GdbRound {
  throw new Error("todo");
}

export function tickGdbRound(_round: GdbRound, _now: number): GdbRound {
  throw new Error("todo");
}

export function isGdbRoundFinished(_round: GdbRound): boolean {
  throw new Error("todo");
}

export function gdbRemainingMs(_round: GdbRound, _now: number): number {
  throw new Error("todo");
}

export function gdbRoundStats(_round: GdbRound): GdbRoundStats {
  throw new Error("todo");
}

export function gdbCommandEvents(
  _round: Pick<GdbRound, "results">,
  _at: number,
): TrainingEvent[] {
  throw new Error("todo");
}
