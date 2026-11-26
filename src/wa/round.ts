import type { TrainingEvent } from "../stats/event";
import type { WaClass } from "./classes";
import { checkWaAnswer, generateWaItem, type WaAnswer, type WaItem } from "./drill";

export const WA_ROUND_SIZE = 5;

export type WaRoundConfig = {
  readonly seed: number;
  readonly classes: readonly WaClass[];
  readonly count?: number;
};

export type WaResolvedRoundConfig = {
  readonly seed: number;
  readonly classes: readonly WaClass[];
  readonly count: number;
};

export type WaItemResult = {
  readonly index: number;
  readonly seed: number;
  readonly caseId: string;
  readonly bugClass: WaClass;
  readonly kc: `wa.${WaClass}`;
  readonly expectedLine: number;
  readonly selectedLine: number | null;
  readonly expectedClass: WaClass;
  readonly selectedClass: WaClass | null;
  readonly ok: boolean;
  readonly lineOk: boolean;
  readonly classOk: boolean;
  readonly skipped: boolean;
  readonly explanation: string;
  readonly timeMs: number;
};

export type WaRound = {
  readonly config: WaResolvedRoundConfig;
  readonly startedAt: number | null;
  readonly itemStartedAt: number | null;
  readonly finishedAt: number | null;
  readonly finished: boolean;
  readonly current: WaItem;
  readonly reviewing: WaItemResult | null;
  readonly results: readonly WaItemResult[];
  readonly last: WaItemResult | null;
};

export type WaClassStats = {
  readonly bugClass: WaClass;
  readonly total: number;
  readonly correct: number;
  readonly avgTimeMs: number;
};

export type WaRoundStats = {
  readonly correct: number;
  readonly wrong: number;
  readonly skipped: number;
  readonly total: number;
  readonly accuracy: number;
  readonly avgTimeMs: number;
  readonly byClass: readonly WaClassStats[];
  readonly wrongItems: readonly WaItemResult[];
};

export function startWaRound(config: WaRoundConfig): WaRound {
  const resolved: WaResolvedRoundConfig = {
    seed: config.seed,
    classes: config.classes,
    count: config.count ?? WA_ROUND_SIZE,
  };
  return {
    config: resolved,
    startedAt: null,
    itemStartedAt: null,
    finishedAt: null,
    finished: false,
    current: generateWaItem(resolved.seed, 0, resolved.classes),
    reviewing: null,
    results: [],
    last: null,
  };
}

/** Starts the stopwatch on the first interaction if not already running. */
export function touchWaRound(round: WaRound, now: number): WaRound {
  if (round.finished || round.startedAt !== null) return round;
  return { ...round, startedAt: now, itemStartedAt: now };
}

export function waElapsedMs(round: WaRound, now: number): number {
  if (round.startedAt === null) return 0;
  const end = round.finishedAt ?? now;
  return Math.max(0, end - round.startedAt);
}

export function isWaRoundFinished(round: WaRound): boolean {
  return round.finished;
}

/** Records an answer and opens post-answer review (counterexample, outputs and fix diff). */
export function submitWaAnswer(round: WaRound, answer: WaAnswer, now: number): WaRound {
  if (round.finished || round.reviewing !== null) return round;
  const base = touchWaRound(round, now);
  const { current } = base;
  const checked = checkWaAnswer(current, answer);
  const timeMs = Math.max(0, now - (base.itemStartedAt ?? now));
  const result: WaItemResult = {
    index: current.index,
    seed: current.seed,
    caseId: current.caseData.id,
    bugClass: current.bugClass,
    kc: current.kc,
    expectedLine: current.caseData.line,
    selectedLine: answer.line,
    expectedClass: current.caseData.class,
    selectedClass: answer.bugClass,
    ok: checked.ok,
    lineOk: checked.lineOk,
    classOk: checked.classOk,
    skipped: false,
    explanation: current.caseData.explanation,
    timeMs,
  };
  return {
    ...base,
    reviewing: result,
    results: [...base.results, result],
    last: result,
  };
}

/** Advances to the next case after review, or finishes the round once all cases are done. */
export function advanceAfterReview(round: WaRound, now: number): WaRound {
  if (round.finished || round.reviewing === null) return round;
  if (round.results.length >= round.config.count) {
    return {
      ...round,
      finished: true,
      finishedAt: now,
      reviewing: null,
    };
  }
  const nextIndex = round.current.index + 1;
  return {
    ...round,
    itemStartedAt: now,
    current: generateWaItem(round.config.seed, nextIndex, round.config.classes),
    reviewing: null,
  };
}

/** Skips the active case immediately, or closes review when reviewing. */
export function skipWaItem(round: WaRound, now: number): WaRound {
  if (round.finished) return round;
  if (round.reviewing !== null) return advanceAfterReview(round, now);
  const base = touchWaRound(round, now);
  const { current } = base;
  const timeMs = Math.max(0, now - (base.itemStartedAt ?? now));
  const result: WaItemResult = {
    index: current.index,
    seed: current.seed,
    caseId: current.caseData.id,
    bugClass: current.bugClass,
    kc: current.kc,
    expectedLine: current.caseData.line,
    selectedLine: null,
    expectedClass: current.caseData.class,
    selectedClass: null,
    ok: false,
    lineOk: false,
    classOk: false,
    skipped: true,
    explanation: current.caseData.explanation,
    timeMs,
  };
  const results = [...base.results, result];
  const done = results.length >= base.config.count;
  const nextIndex = current.index + 1;
  return {
    ...base,
    itemStartedAt: now,
    finished: done,
    finishedAt: done ? now : null,
    current: done ? current : generateWaItem(base.config.seed, nextIndex, base.config.classes),
    reviewing: null,
    results,
    last: result,
  };
}

export function waRoundStats(round: WaRound): WaRoundStats {
  const { results } = round;
  let correct = 0;
  let wrong = 0;
  let skipped = 0;
  let totalTimeMs = 0;
  const byMap = new Map<WaClass, { total: number; correct: number; timeMs: number }>();

  for (const r of results) {
    if (r.skipped) skipped += 1;
    else if (r.ok) correct += 1;
    else wrong += 1;
    totalTimeMs += r.timeMs;
    const entry = byMap.get(r.bugClass) ?? { total: 0, correct: 0, timeMs: 0 };
    entry.total += 1;
    if (r.ok) entry.correct += 1;
    entry.timeMs += r.timeMs;
    byMap.set(r.bugClass, entry);
  }

  const total = results.length;
  const answered = correct + wrong;
  const byClass: WaClassStats[] = [...byMap.entries()].map(([bugClass, entry]) => ({
    bugClass,
    total: entry.total,
    correct: entry.correct,
    avgTimeMs: Math.round(entry.timeMs / entry.total),
  }));

  return {
    correct,
    wrong,
    skipped,
    total,
    accuracy: answered > 0 ? correct / answered : 0,
    avgTimeMs: total > 0 ? Math.round(totalTimeMs / total) : 0,
    byClass,
    wrongItems: results.filter((r) => !r.ok && !r.skipped),
  };
}

/** One T22 TrainingEvent per attempted or skipped case in a Caça ao WA round (AC-4). */
export function waRoundEvents(round: Pick<WaRound, "results">, at: number): TrainingEvent[] {
  return round.results.map((r) => ({
    at,
    drill: "wa.hunt",
    config: "hunt",
    kc: r.kc,
    ok: r.ok,
    timeMs: r.timeMs,
    extra: {
      seed: r.seed,
      i: r.index,
      caseId: r.caseId,
      class: r.bugClass,
      lineOk: r.lineOk,
      classOk: r.classOk,
      skipped: r.skipped,
    },
  }));
}
