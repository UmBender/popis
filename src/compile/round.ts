import type { TrainingEvent } from "../stats/event";
import type { CauseId, CompileGroup } from "./causes";
import type { CompileAnswer, CompileItem } from "./drill";

export const COMPILE_DURATIONS_S = [60, 90, 120] as const;

export type CompileRoundConfig = {
  readonly durationMs: number;
  readonly seed: number;
  readonly groups: readonly CompileGroup[];
};

export type CompileItemResult = {
  readonly index: number;
  readonly seed: number;
  readonly caseId: string;
  readonly group: CompileGroup;
  readonly kc: `compile.${CompileGroup}`;
  readonly expectedLine: number;
  readonly selectedLine: number | null;
  readonly expectedCause: CauseId;
  readonly selectedCause: CauseId | null;
  readonly ok: boolean;
  readonly lineOk: boolean;
  readonly causeOk: boolean;
  readonly skipped: boolean;
  readonly explanation: string;
  readonly timeMs: number;
};

export type CompileRound = {
  readonly config: CompileRoundConfig;
  readonly startedAt: number | null;
  readonly itemStartedAt: number | null;
  readonly finished: boolean;
  readonly current: CompileItem;
  readonly reviewing: CompileItemResult | null;
  readonly results: readonly CompileItemResult[];
  readonly last: CompileItemResult | null;
};

export type CompileGroupStats = {
  readonly group: CompileGroup;
  readonly total: number;
  readonly correct: number;
  readonly avgTimeMs: number;
};

export type CompileRoundStats = {
  readonly correct: number;
  readonly wrong: number;
  readonly skipped: number;
  readonly total: number;
  readonly accuracy: number;
  readonly byGroup: readonly CompileGroupStats[];
  readonly wrongItems: readonly CompileItemResult[];
};

export function startCompileRound(_config: CompileRoundConfig): CompileRound {
  throw new Error("todo");
}

export function touchCompileRound(_round: CompileRound, _now: number): CompileRound {
  throw new Error("todo");
}

export function isCompileRoundFinished(_round: CompileRound): boolean {
  throw new Error("todo");
}

export function compileRemainingMs(_round: CompileRound, _now: number): number {
  throw new Error("todo");
}

export function tickCompileRound(_round: CompileRound, _now: number): CompileRound {
  throw new Error("todo");
}

export function submitCompileAnswer(
  _round: CompileRound,
  _answer: CompileAnswer,
  _now: number,
): CompileRound {
  throw new Error("todo");
}

export function advanceAfterReview(_round: CompileRound, _now: number): CompileRound {
  throw new Error("todo");
}

export function skipCompileItem(_round: CompileRound, _now: number): CompileRound {
  throw new Error("todo");
}

export function compileRoundStats(_round: CompileRound): CompileRoundStats {
  throw new Error("todo");
}

export function compileRoundEvents(
  _round: Pick<CompileRound, "results">,
  _at: number,
): TrainingEvent[] {
  throw new Error("todo");
}
