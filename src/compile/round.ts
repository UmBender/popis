import type { TrainingEvent } from "../stats/event";
import type { CauseId, CompileGroup } from "./causes";
import {
  checkCompileAnswer,
  generateCompileItem,
  type CompileAnswer,
  type CompileItem,
} from "./drill";

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

export function startCompileRound(config: CompileRoundConfig): CompileRound {
  return {
    config,
    startedAt: null,
    itemStartedAt: null,
    finished: false,
    current: generateCompileItem(config.seed, 0, config.groups),
    reviewing: null,
    results: [],
    last: null,
  };
}

/** Starts the clock on the first interaction if not already running. */
export function touchCompileRound(round: CompileRound, now: number): CompileRound {
  if (round.finished || round.startedAt !== null) return round;
  return { ...round, startedAt: now, itemStartedAt: now };
}

export function isCompileRoundFinished(round: CompileRound): boolean {
  return round.finished;
}

export function compileRemainingMs(round: CompileRound, now: number): number {
  if (round.finished) return 0;
  if (round.startedAt === null) return round.config.durationMs;
  return Math.max(0, round.config.durationMs - (now - round.startedAt));
}

export function tickCompileRound(round: CompileRound, now: number): CompileRound {
  if (round.finished || round.startedAt === null) return round;
  if (now - round.startedAt >= round.config.durationMs) {
    return { ...round, finished: true, reviewing: null };
  }
  return round;
}

function nextState(round: CompileRound, item: CompileItemResult, now: number): CompileRound {
  const startedAt = round.startedAt ?? now;
  const expired = now - startedAt >= round.config.durationMs;
  const nextIndex = round.current.index + 1;
  return {
    ...round,
    startedAt,
    itemStartedAt: now,
    finished: expired,
    current: expired
      ? round.current
      : generateCompileItem(round.config.seed, nextIndex, round.config.groups),
    reviewing: null,
    results: [...round.results, item],
    last: item,
  };
}

export function submitCompileAnswer(
  round: CompileRound,
  answer: CompileAnswer,
  now: number,
): CompileRound {
  if (round.finished || round.reviewing !== null) return round;
  const base = touchCompileRound(round, now);
  const { current } = base;
  const checked = checkCompileAnswer(current, answer);
  const timeMs = Math.max(0, now - (base.itemStartedAt ?? now));
  const result: CompileItemResult = {
    index: current.index,
    seed: current.seed,
    caseId: current.caseData.id,
    group: current.group,
    kc: current.kc,
    expectedLine: current.caseData.line,
    selectedLine: answer.line,
    expectedCause: current.caseData.cause,
    selectedCause: answer.cause,
    ok: checked.ok,
    lineOk: checked.lineOk,
    causeOk: checked.causeOk,
    skipped: false,
    explanation: current.caseData.explanation,
    timeMs,
  };
  if (checked.ok) return nextState(base, result, now);

  const startedAt = base.startedAt ?? now;
  const expired = now - startedAt >= base.config.durationMs;
  return {
    ...base,
    startedAt,
    finished: expired,
    reviewing: expired ? null : result,
    results: [...base.results, result],
    last: result,
  };
}

export function advanceAfterReview(round: CompileRound, now: number): CompileRound {
  if (round.finished || round.reviewing === null) return round;
  const startedAt = round.startedAt ?? now;
  const expired = now - startedAt >= round.config.durationMs;
  const nextIndex = round.current.index + 1;
  return {
    ...round,
    itemStartedAt: now,
    finished: expired,
    current: expired
      ? round.current
      : generateCompileItem(round.config.seed, nextIndex, round.config.groups),
    reviewing: null,
  };
}

export function skipCompileItem(round: CompileRound, now: number): CompileRound {
  if (round.finished) return round;
  if (round.reviewing !== null) return advanceAfterReview(round, now);
  const base = touchCompileRound(round, now);
  const { current } = base;
  const timeMs = Math.max(0, now - (base.itemStartedAt ?? now));
  const result: CompileItemResult = {
    index: current.index,
    seed: current.seed,
    caseId: current.caseData.id,
    group: current.group,
    kc: current.kc,
    expectedLine: current.caseData.line,
    selectedLine: null,
    expectedCause: current.caseData.cause,
    selectedCause: null,
    ok: false,
    lineOk: false,
    causeOk: false,
    skipped: true,
    explanation: current.caseData.explanation,
    timeMs,
  };
  return nextState(base, result, now);
}

export function compileRoundStats(round: CompileRound): CompileRoundStats {
  const { results } = round;
  let correct = 0;
  let wrong = 0;
  let skipped = 0;
  const groups = new Map<CompileGroup, { total: number; correct: number; timeMs: number }>();

  for (const r of results) {
    if (r.skipped) skipped += 1;
    else if (r.ok) correct += 1;
    else wrong += 1;
    const g = groups.get(r.group) ?? { total: 0, correct: 0, timeMs: 0 };
    g.total += 1;
    if (r.ok) g.correct += 1;
    g.timeMs += r.timeMs;
    groups.set(r.group, g);
  }

  const total = results.length;
  const answered = correct + wrong;
  const byGroup: CompileGroupStats[] = [...groups.entries()].map(([group, g]) => ({
    group,
    total: g.total,
    correct: g.correct,
    avgTimeMs: Math.round(g.timeMs / g.total),
  }));

  return {
    correct,
    wrong,
    skipped,
    total,
    accuracy: answered > 0 ? correct / answered : 0,
    byGroup,
    wrongItems: results.filter((r) => !r.ok && !r.skipped),
  };
}

/** One T22 TrainingEvent per attempted or skipped item in a Ler o erro round (AC-4). */
export function compileRoundEvents(
  round: Pick<CompileRound, "results">,
  at: number,
): TrainingEvent[] {
  return round.results.map((r) => ({
    at,
    drill: "compile.read",
    config: "read",
    kc: r.kc,
    ok: r.ok,
    timeMs: r.timeMs,
    extra: {
      seed: r.seed,
      i: r.index,
      caseId: r.caseId,
      group: r.group,
      lineOk: r.lineOk,
      causeOk: r.causeOk,
      skipped: r.skipped,
    },
  }));
}
