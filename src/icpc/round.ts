import type { TrainingEvent } from "../stats/event";
import { checkIcpcAnswer } from "./check";
import { generateIcpcItem, type IcpcItem, type IcpcKind, type IcpcKindFilter } from "./drill";

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

function makeItem(config: IcpcRoundConfig, index: number): IcpcItem {
  return generateIcpcItem(config.seed, index, {
    kind: config.kind,
    compileErrorCounts: config.compileErrorCounts,
  });
}

export function startIcpcRound(config: IcpcRoundConfig): IcpcRound {
  return {
    config,
    startedAt: null,
    itemStartedAt: null,
    finished: false,
    current: makeItem(config, 0),
    results: [],
    last: null,
  };
}

/** Starts the clock on the first keystroke if not already running. */
export function touchIcpcRound(round: IcpcRound, now: number): IcpcRound {
  if (round.finished || round.startedAt !== null) return round;
  return { ...round, startedAt: now, itemStartedAt: now };
}

export function isIcpcRoundFinished(round: IcpcRound): boolean {
  return round.finished;
}

export function icpcRemainingMs(round: IcpcRound, now: number): number {
  if (round.finished) return 0;
  if (round.startedAt === null) return round.config.durationMs;
  return Math.max(0, round.config.durationMs - (now - round.startedAt));
}

export function tickIcpcRound(round: IcpcRound, now: number): IcpcRound {
  if (round.finished || round.startedAt === null) return round;
  if (now - round.startedAt >= round.config.durationMs) {
    return { ...round, finished: true };
  }
  return round;
}

function advance(
  round: IcpcRound,
  startedAt: number,
  item: IcpcItemResult,
  now: number,
): IcpcRound {
  const expired = now - startedAt >= round.config.durationMs;
  const nextIndex = round.current.index + 1;
  return {
    ...round,
    startedAt,
    itemStartedAt: now,
    finished: expired,
    current: expired ? round.current : makeItem(round.config, nextIndex),
    results: [...round.results, item],
    last: item,
  };
}

export function submitIcpcAnswer(round: IcpcRound, text: string, now: number): IcpcRound {
  if (round.finished) return round;
  const startedAt = round.startedAt ?? now;
  const itemStartedAt = round.itemStartedAt ?? now;
  const { current } = round;
  const checked = checkIcpcAnswer(current.kind, text, current.canonical);
  const timeMs = Math.max(0, now - itemStartedAt);
  const result: IcpcItemResult = {
    index: current.index,
    seed: current.seed,
    kind: current.kind,
    kc: current.kc,
    compileErrorCounts: current.compileErrorCounts,
    prompt: current.prompt,
    canonical: current.canonical,
    typed: text.trim(),
    ok: checked.ok,
    skipped: false,
    reason: checked.ok ? "" : checked.reason,
    explanation: current.explanation,
    timeMs,
  };
  return advance(round, startedAt, result, now);
}

export function skipIcpcItem(round: IcpcRound, now: number): IcpcRound {
  if (round.finished) return round;
  const startedAt = round.startedAt ?? now;
  const itemStartedAt = round.itemStartedAt ?? now;
  const { current } = round;
  const timeMs = Math.max(0, now - itemStartedAt);
  const result: IcpcItemResult = {
    index: current.index,
    seed: current.seed,
    kind: current.kind,
    kc: current.kc,
    compileErrorCounts: current.compileErrorCounts,
    prompt: current.prompt,
    canonical: current.canonical,
    typed: "",
    ok: false,
    skipped: true,
    reason: "Item pulado.",
    explanation: current.explanation,
    timeMs,
  };
  return advance(round, startedAt, result, now);
}

export function icpcRoundStats(round: IcpcRound): IcpcRoundStats {
  const { results } = round;
  let correct = 0;
  let wrong = 0;
  let skipped = 0;
  const groups = new Map<IcpcKind, { total: number; correct: number; timeMs: number }>();

  for (const r of results) {
    if (r.skipped) skipped += 1;
    else if (r.ok) correct += 1;
    else wrong += 1;
    const g = groups.get(r.kind) ?? { total: 0, correct: 0, timeMs: 0 };
    g.total += 1;
    if (r.ok) g.correct += 1;
    g.timeMs += r.timeMs;
    groups.set(r.kind, g);
  }

  const total = results.length;
  const answered = correct + wrong;
  const byKind: IcpcKindStats[] = [...groups.entries()].map(([kind, g]) => ({
    kind,
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
    byKind,
    wrongItems: results.filter((r) => !r.ok && !r.skipped),
  };
}

/** One T22 TrainingEvent per attempted or skipped item in an ICPC scoreboard round (T43 AC-3). */
export function icpcRoundEvents(
  round: Pick<IcpcRound, "results" | "config">,
  at: number,
): TrainingEvent[] {
  const durS = Math.round(round.config.durationMs / 1000);
  const config = `${String(durS)}s-${round.config.kind}${round.config.compileErrorCounts ? "-ce" : ""}`;
  return round.results.map((r) => ({
    at,
    drill: "icpc.score",
    config,
    kc: r.kc,
    ok: r.ok,
    timeMs: r.timeMs,
    extra: {
      seed: r.seed,
      i: r.index,
      kind: r.kind,
      compileErrorCounts: r.compileErrorCounts,
      skipped: r.skipped,
    },
  }));
}
