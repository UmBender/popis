import type { TrainingEvent } from "../stats/event";
import { checkOutput } from "./check-output";
import {
  generateOutputItem,
  type GdbOutKind,
  type GdbOutLevel,
  type GdbOutputItem,
} from "./out-drill";

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

export function startGdbOutRound(config: GdbOutRoundConfig): GdbOutRound {
  return {
    config,
    startedAt: null,
    itemStartedAt: null,
    finished: false,
    current: generateOutputItem(config.seed, 0, config.level, config.kinds),
    results: [],
    last: null,
  };
}

export function touchGdbOutRound(round: GdbOutRound, now: number): GdbOutRound {
  if (round.finished || round.startedAt !== null) return round;
  return { ...round, startedAt: now, itemStartedAt: now };
}

export function isGdbOutRoundFinished(round: GdbOutRound): boolean {
  return round.finished;
}

export function gdbOutRemainingMs(round: GdbOutRound, now: number): number {
  if (round.finished) return 0;
  if (round.startedAt === null) return round.config.durationMs;
  return Math.max(0, round.config.durationMs - (now - round.startedAt));
}

export function tickGdbOutRound(round: GdbOutRound, now: number): GdbOutRound {
  if (round.finished || round.startedAt === null) return round;
  if (now - round.startedAt >= round.config.durationMs) {
    return { ...round, finished: true };
  }
  return round;
}

function advance(round: GdbOutRound, item: GdbOutItemResult, now: number): GdbOutRound {
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
      : generateOutputItem(round.config.seed, nextIndex, round.config.level, round.config.kinds),
    results: [...round.results, item],
    last: item,
  };
}

export function submitGdbOutput(round: GdbOutRound, text: string, now: number): GdbOutRound {
  if (round.finished) return round;
  const base = touchGdbOutRound(round, now);
  const { current } = base;
  const checked = checkOutput(text, current.canonical, {
    command: current.command,
    kind: current.commandKind,
    fallbackReason: current.reason,
  });
  const timeMs = Math.max(0, now - (base.itemStartedAt ?? now));
  const result: GdbOutItemResult = {
    index: current.index,
    seed: current.seed,
    level: current.level,
    kind: current.kind,
    kc: current.kc,
    command: current.command,
    canonical: current.canonical,
    typed: text.trim(),
    ok: checked.ok,
    skipped: false,
    reason: checked.ok ? "" : checked.reason,
    timeMs,
  };
  return advance(base, result, now);
}

export function skipGdbOutItem(round: GdbOutRound, now: number): GdbOutRound {
  if (round.finished) return round;
  const base = touchGdbOutRound(round, now);
  const { current } = base;
  const timeMs = Math.max(0, now - (base.itemStartedAt ?? now));
  const result: GdbOutItemResult = {
    index: current.index,
    seed: current.seed,
    level: current.level,
    kind: current.kind,
    kc: current.kc,
    command: current.command,
    canonical: current.canonical,
    typed: "",
    ok: false,
    skipped: true,
    reason: current.reason,
    timeMs,
  };
  return advance(base, result, now);
}

export function gdbOutRoundStats(round: GdbOutRound): GdbOutRoundStats {
  const { results } = round;
  let correct = 0;
  let wrong = 0;
  let skipped = 0;
  const groups = new Map<GdbOutKind, { total: number; correct: number; timeMs: number }>();

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
  const byKind: GdbOutKindStats[] = [...groups.entries()].map(([kind, g]) => ({
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

/** One T22 TrainingEvent per attempted or skipped item in a GDB Saída round (T26 AC-7). */
export function gdbOutputEvents(round: Pick<GdbOutRound, "results">, at: number): TrainingEvent[] {
  return round.results.map((r) => ({
    at,
    drill: "gdb.out",
    config: `out-L${String(r.level)}`,
    kc: r.kc,
    ok: r.ok,
    timeMs: r.timeMs,
    extra: {
      seed: r.seed,
      i: r.index,
      kind: r.kind,
      level: r.level,
      skipped: r.skipped,
    },
  }));
}
