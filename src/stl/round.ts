import type { TrainingEvent } from "../stats/event";
import { checkStlAnswer } from "./check";
import { generateStlItem, type StlItem, type StlLevel, type StlModel } from "./drill";

export const STL_DURATIONS_S = [30, 60, 120] as const;

export type StlRoundConfig = {
  readonly durationMs: number;
  readonly seed: number;
  readonly level: StlLevel;
};

export type StlItemResult = {
  readonly index: number;
  readonly seed: number;
  readonly level: StlLevel;
  readonly model: StlModel;
  readonly kc: `stl.${StlModel}`;
  readonly lines: readonly string[];
  readonly canonical: string;
  readonly typed: string;
  readonly ok: boolean;
  readonly skipped: boolean;
  readonly reason: string;
  readonly explanation: string;
  readonly timeMs: number;
};

export type StlRound = {
  readonly config: StlRoundConfig;
  readonly startedAt: number | null;
  readonly itemStartedAt: number | null;
  readonly finished: boolean;
  readonly current: StlItem;
  readonly results: readonly StlItemResult[];
  readonly last: StlItemResult | null;
};

export type StlModelStats = {
  readonly model: StlModel;
  readonly total: number;
  readonly correct: number;
  readonly avgTimeMs: number;
};

export type StlRoundStats = {
  readonly correct: number;
  readonly wrong: number;
  readonly skipped: number;
  readonly total: number;
  readonly accuracy: number;
  readonly byModel: readonly StlModelStats[];
  readonly wrongItems: readonly StlItemResult[];
};

export function startStlRound(config: StlRoundConfig): StlRound {
  return {
    config,
    startedAt: null,
    itemStartedAt: null,
    finished: false,
    current: generateStlItem(config.seed, 0, config.level),
    results: [],
    last: null,
  };
}

/** Starts the clock on the first keystroke if not already running. */
export function touchStlRound(round: StlRound, now: number): StlRound {
  if (round.finished || round.startedAt !== null) return round;
  return { ...round, startedAt: now, itemStartedAt: now };
}

export function isStlRoundFinished(round: StlRound): boolean {
  return round.finished;
}

export function stlRemainingMs(round: StlRound, now: number): number {
  if (round.finished) return 0;
  if (round.startedAt === null) return round.config.durationMs;
  return Math.max(0, round.config.durationMs - (now - round.startedAt));
}

export function tickStlRound(round: StlRound, now: number): StlRound {
  if (round.finished || round.startedAt === null) return round;
  if (now - round.startedAt >= round.config.durationMs) {
    return { ...round, finished: true };
  }
  return round;
}

function advance(round: StlRound, item: StlItemResult, now: number): StlRound {
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
      : generateStlItem(round.config.seed, nextIndex, round.config.level),
    results: [...round.results, item],
    last: item,
  };
}

export function submitStlAnswer(round: StlRound, text: string, now: number): StlRound {
  if (round.finished) return round;
  const base = touchStlRound(round, now);
  const { current } = base;
  const checked = checkStlAnswer(text, current.canonical, { boolalpha: current.boolalpha });
  const timeMs = Math.max(0, now - (base.itemStartedAt ?? now));
  const result: StlItemResult = {
    index: current.index,
    seed: current.seed,
    level: current.level,
    model: current.model,
    kc: current.kc,
    lines: current.lines,
    canonical: current.canonical,
    typed: text.trim(),
    ok: checked.ok,
    skipped: false,
    reason: checked.ok ? "" : checked.reason,
    explanation: current.explanation,
    timeMs,
  };
  return advance(base, result, now);
}

export function skipStlItem(round: StlRound, now: number): StlRound {
  if (round.finished) return round;
  const base = touchStlRound(round, now);
  const { current } = base;
  const timeMs = Math.max(0, now - (base.itemStartedAt ?? now));
  const result: StlItemResult = {
    index: current.index,
    seed: current.seed,
    level: current.level,
    model: current.model,
    kc: current.kc,
    lines: current.lines,
    canonical: current.canonical,
    typed: "",
    ok: false,
    skipped: true,
    reason: "Item pulado.",
    explanation: current.explanation,
    timeMs,
  };
  return advance(base, result, now);
}

export function stlRoundStats(round: StlRound): StlRoundStats {
  const { results } = round;
  let correct = 0;
  let wrong = 0;
  let skipped = 0;
  const groups = new Map<StlModel, { total: number; correct: number; timeMs: number }>();

  for (const r of results) {
    if (r.skipped) skipped += 1;
    else if (r.ok) correct += 1;
    else wrong += 1;
    const g = groups.get(r.model) ?? { total: 0, correct: 0, timeMs: 0 };
    g.total += 1;
    if (r.ok) g.correct += 1;
    g.timeMs += r.timeMs;
    groups.set(r.model, g);
  }

  const total = results.length;
  const answered = correct + wrong;
  const byModel: StlModelStats[] = [...groups.entries()].map(([model, g]) => ({
    model,
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
    byModel,
    wrongItems: results.filter((r) => !r.ok && !r.skipped),
  };
}

/** One T22 TrainingEvent per attempted or skipped item in an STL round (T42 AC-5). */
export function stlOutputEvents(round: Pick<StlRound, "results">, at: number): TrainingEvent[] {
  return round.results.map((r) => ({
    at,
    drill: "stl.out",
    config: `stl-L${String(r.level)}`,
    kc: r.kc,
    ok: r.ok,
    timeMs: r.timeMs,
    extra: {
      seed: r.seed,
      i: r.index,
      model: r.model,
      level: r.level,
      skipped: r.skipped,
    },
  }));
}
