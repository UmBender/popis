import type { TrainingEvent } from "../stats/event";
import type { GdbOutKind, GdbOutLevel, GdbOutputItem } from "./out-drill";

export type GdbOutRoundConfig = {
  readonly durationMs: number;
  readonly seed: number;
  readonly level: GdbOutLevel;
  readonly kinds: readonly GdbOutKind[];
};

export type GdbOutItemResult = {
  readonly index: number;
  readonly seed: number;
  readonly level: GdbOutLevel;
  readonly kind: GdbOutKind;
  readonly kc: `gdb.out.${GdbOutKind}`;
  readonly command: string;
  readonly canonical: string;
  readonly typed: string;
  readonly ok: boolean;
  readonly skipped: boolean;
  readonly reason: string;
  readonly timeMs: number;
};

export type GdbOutRound = {
  readonly config: GdbOutRoundConfig;
  readonly startedAt: number | null;
  readonly itemStartedAt: number | null;
  readonly finished: boolean;
  readonly current: GdbOutputItem;
  readonly results: readonly GdbOutItemResult[];
  readonly last: GdbOutItemResult | null;
};

export type GdbOutKindStats = {
  readonly kind: GdbOutKind;
  readonly total: number;
  readonly correct: number;
  readonly avgTimeMs: number;
};

export type GdbOutRoundStats = {
  readonly correct: number;
  readonly wrong: number;
  readonly skipped: number;
  readonly total: number;
  readonly accuracy: number;
  readonly byKind: readonly GdbOutKindStats[];
  readonly wrongItems: readonly GdbOutItemResult[];
};

export function startGdbOutRound(_config: GdbOutRoundConfig): GdbOutRound {
  throw new Error("todo");
}

export function touchGdbOutRound(_round: GdbOutRound, _now: number): GdbOutRound {
  throw new Error("todo");
}

export function isGdbOutRoundFinished(_round: GdbOutRound): boolean {
  throw new Error("todo");
}

export function gdbOutRemainingMs(_round: GdbOutRound, _now: number): number {
  throw new Error("todo");
}

export function tickGdbOutRound(_round: GdbOutRound, _now: number): GdbOutRound {
  throw new Error("todo");
}

export function submitGdbOutput(_round: GdbOutRound, _text: string, _now: number): GdbOutRound {
  throw new Error("todo");
}

export function skipGdbOutItem(_round: GdbOutRound, _now: number): GdbOutRound {
  throw new Error("todo");
}

export function gdbOutRoundStats(_round: GdbOutRound): GdbOutRoundStats {
  throw new Error("todo");
}

export function gdbOutputEvents(
  _round: Pick<GdbOutRound, "results">,
  _at: number,
): TrainingEvent[] {
  throw new Error("todo");
}
