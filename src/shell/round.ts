import type { TrainingEvent } from "../stats/event";
import { checkShellCommand } from "./check";
import { generateShellItem, type ShellDrillItem, type ShellDrillKind } from "./drill";

export const SHELL_DURATIONS_S = [30, 60, 120] as const;

export type ShellRoundConfig = {
  readonly durationMs: number;
  readonly seed: number;
  readonly kinds: readonly ShellDrillKind[];
};

export type ShellItemResult = {
  readonly index: number;
  readonly seed: number;
  readonly kind: ShellDrillKind;
  readonly kc: `shell.${ShellDrillKind}`;
  readonly prompt: string;
  readonly canonical: string;
  readonly typed: string;
  readonly ok: boolean;
  readonly skipped: boolean;
  readonly reason: string;
  readonly timeMs: number;
};

export type ShellRound = {
  readonly config: ShellRoundConfig;
  readonly startedAt: number | null;
  readonly itemStartedAt: number | null;
  readonly finished: boolean;
  readonly current: ShellDrillItem;
  readonly results: readonly ShellItemResult[];
  readonly last: ShellItemResult | null;
};

export type ShellKindStats = {
  readonly kind: ShellDrillKind;
  readonly total: number;
  readonly correct: number;
  readonly avgTimeMs: number;
};

export type ShellRoundStats = {
  readonly correct: number;
  readonly wrong: number;
  readonly skipped: number;
  readonly total: number;
  readonly accuracy: number;
  readonly byKind: readonly ShellKindStats[];
  readonly wrongItems: readonly ShellItemResult[];
};

export function startShellRound(config: ShellRoundConfig): ShellRound {
  return {
    config,
    startedAt: null,
    itemStartedAt: null,
    finished: false,
    current: generateShellItem(config.seed, 0, config.kinds),
    results: [],
    last: null,
  };
}

/** Starts the clock on the first keystroke if not already running. */
export function touchShellRound(round: ShellRound, now: number): ShellRound {
  if (round.finished || round.startedAt !== null) return round;
  return { ...round, startedAt: now, itemStartedAt: now };
}

export function isShellRoundFinished(round: ShellRound): boolean {
  return round.finished;
}

export function shellRemainingMs(round: ShellRound, now: number): number {
  if (round.finished) return 0;
  if (round.startedAt === null) return round.config.durationMs;
  return Math.max(0, round.config.durationMs - (now - round.startedAt));
}

export function tickShellRound(round: ShellRound, now: number): ShellRound {
  if (round.finished || round.startedAt === null) return round;
  if (now - round.startedAt >= round.config.durationMs) {
    return { ...round, finished: true };
  }
  return round;
}

function advance(round: ShellRound, item: ShellItemResult, now: number): ShellRound {
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
      : generateShellItem(round.config.seed, nextIndex, round.config.kinds),
    results: [...round.results, item],
    last: item,
  };
}

export function submitShellCommand(round: ShellRound, text: string, now: number): ShellRound {
  if (round.finished) return round;
  const base = touchShellRound(round, now);
  const { current } = base;
  const checked = checkShellCommand(text, current.expected);
  const timeMs = Math.max(0, now - (base.itemStartedAt ?? now));
  const result: ShellItemResult = {
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

export function skipShellItem(round: ShellRound, now: number): ShellRound {
  if (round.finished) return round;
  const base = touchShellRound(round, now);
  const { current } = base;
  const timeMs = Math.max(0, now - (base.itemStartedAt ?? now));
  const result: ShellItemResult = {
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

export function shellRoundStats(round: ShellRound): ShellRoundStats {
  const { results } = round;
  let correct = 0;
  let wrong = 0;
  let skipped = 0;
  const groups = new Map<ShellDrillKind, { total: number; correct: number; timeMs: number }>();

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
  const byKind: ShellKindStats[] = [...groups.entries()].map(([kind, g]) => ({
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

/** One T22 TrainingEvent per attempted or skipped item in a Shell Comandos round (AC-5). */
export function shellCommandEvents(
  round: Pick<ShellRound, "results">,
  at: number,
): TrainingEvent[] {
  return round.results.map((r) => ({
    at,
    drill: "shell.cmd",
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
