import type { TrainingEvent } from "../stats/event";
import type { IcpcItem, IcpcKind, IcpcKindFilter } from "./drill";

export const ICPC_DURATIONS_S = [60, 90, 120] as const;

export type IcpcRoundConfig = {
  readonly durationMs: number;
  readonly seed: number;
  readonly kind: IcpcKindFilter;
  readonly compileErrorCounts: boolean;
};

export type IcpcItemResult = {
  readonly index: number;
  readonly seed: number;
  readonly kind: IcpcKind;
  readonly kc: `icpc.${IcpcKind}`;
  readonly compileErrorCounts: boolean;
  readonly prompt: string;
  readonly canonical: string;
  readonly typed: string;
  readonly ok: boolean;
  readonly skipped: boolean;
  readonly reason: string;
  readonly explanation: string;
  readonly timeMs: number;
};

export type IcpcRound = {
  readonly config: IcpcRoundConfig;
  readonly startedAt: number | null;
  readonly itemStartedAt: number | null;
  readonly finished: boolean;
  readonly current: IcpcItem;
  readonly results: readonly IcpcItemResult[];
  readonly last: IcpcItemResult | null;
};

export type IcpcKindStats = {
  readonly kind: IcpcKind;
  readonly total: number;
  readonly correct: number;
  readonly avgTimeMs: number;
};

export type IcpcRoundStats = {
  readonly correct: number;
  readonly wrong: number;
  readonly skipped: number;
  readonly total: number;
  readonly accuracy: number;
  readonly byKind: readonly IcpcKindStats[];
  readonly wrongItems: readonly IcpcItemResult[];
};

export function startIcpcRound(_config: IcpcRoundConfig): IcpcRound {
  throw new Error("todo");
}

export function touchIcpcRound(_round: IcpcRound, _now: number): IcpcRound {
  throw new Error("todo");
}

export function isIcpcRoundFinished(_round: IcpcRound): boolean {
  throw new Error("todo");
}

export function icpcRemainingMs(_round: IcpcRound, _now: number): number {
  throw new Error("todo");
}

export function tickIcpcRound(_round: IcpcRound, _now: number): IcpcRound {
  throw new Error("todo");
}

export function submitIcpcAnswer(_round: IcpcRound, _text: string, _now: number): IcpcRound {
  throw new Error("todo");
}

export function skipIcpcItem(_round: IcpcRound, _now: number): IcpcRound {
  throw new Error("todo");
}

export function icpcRoundStats(_round: IcpcRound): IcpcRoundStats {
  throw new Error("todo");
}

export function icpcRoundEvents(
  _round: Pick<IcpcRound, "results" | "config">,
  _at: number,
): TrainingEvent[] {
  throw new Error("todo");
}
