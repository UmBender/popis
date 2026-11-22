import type { TrainingEvent } from "../stats/event";
import { checkCommand } from "./check";
import { generateCommandItem, type GdbCmdKind, type GdbCommandItem } from "./cmd-drill";

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

export function startGdbRound(config: GdbRoundConfig): GdbRound {
  return {
    config,
    startedAt: null,
    itemStartedAt: null,
    finished: false,
    current: generateCommandItem(config.seed, 0, config.kinds),
    results: [],
    last: null,
  };
}

/** Starts the clock on the first keystroke if not already running. */
export function touchGdbRound(round: GdbRound, now: number): GdbRound {
  if (round.finished || round.startedAt !== null) return round;
  return { ...round, startedAt: now, itemStartedAt: now };
}

export function isGdbRoundFinished(round: GdbRound): boolean {
  return round.finished;
}

export function gdbRemainingMs(round: GdbRound, now: number): number {
  if (round.finished) return 0;
  if (round.startedAt === null) return round.config.durationMs;
  return Math.max(0, round.config.durationMs - (now - round.startedAt));
}

export function tickGdbRound(round: GdbRound, now: number): GdbRound {
  if (round.finished || round.startedAt === null) return round;
  if (now - round.startedAt >= round.config.durationMs) {
    return { ...round, finished: true };
  }
  return round;
}

function advance(round: GdbRound, item: GdbItemResult, now: number): GdbRound {
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
      : generateCommandItem(round.config.seed, nextIndex, round.config.kinds),
    results: [...round.results, item],
    last: item,
  };
}

export function submitGdbCommand(round: GdbRound, text: string, now: number): GdbRound {
  if (round.finished) return round;
  const base = touchGdbRound(round, now);
  const { current } = base;
  const checked = checkCommand(text, current.expected, current.context);
  const timeMs = Math.max(0, now - (base.itemStartedAt ?? now));
  const result: GdbItemResult = {
    index: current.index,
    seed: current.seed,
    kind: current.kind,
    kc: current.kc,
    prompt: current.prompt,
    canonical: current.canonical,
    typed: text.trim(),
    ok: checked.ok,
    skipped: false,
    reason: checked.ok ? "" : checked.reason,
    timeMs,
  };
  return advance(base, result, now);
}

export function skipGdbItem(round: GdbRound, now: number): GdbRound {
  if (round.finished) return round;
  const base = touchGdbRound(round, now);
  const { current } = base;
  const timeMs = Math.max(0, now - (base.itemStartedAt ?? now));
  const result: GdbItemResult = {
    index: current.index,
    seed: current.seed,
    kind: current.kind,
    kc: current.kc,
    prompt: current.prompt,
    canonical: current.canonical,
    typed: "",
    ok: false,
    skipped: true,
    reason: "Item pulado.",
    timeMs,
  };
  return advance(base, result, now);
}

export function gdbRoundStats(round: GdbRound): GdbRoundStats {
  const { results } = round;
  let correct = 0;
  let wrong = 0;
  let skipped = 0;
  const groups = new Map<GdbCmdKind, { total: number; correct: number; timeMs: number }>();

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
  const byKind: GdbKindStats[] = [...groups.entries()].map(([kind, g]) => ({
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

/** One T22 TrainingEvent per attempted or skipped item in a GDB Comandos round (AC-5). */
export function gdbCommandEvents(round: Pick<GdbRound, "results">, at: number): TrainingEvent[] {
  return round.results.map((r) => ({
    at,
    drill: "gdb.cmd",
    config: "cmd",
    kc: r.kc,
    ok: r.ok,
    timeMs: r.timeMs,
    extra: {
      seed: r.seed,
      i: r.index,
      kind: r.kind,
      skipped: r.skipped,
    },
  }));
}
