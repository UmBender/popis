import type { TypingState } from "../typing/engine";
import type { WordsState } from "../typing/words-engine";
import type { TrainingEvent } from "./event";

/** One key that inserted something, as the typing run saw it. */
export type Stamp = {
  readonly at: number;
  /** Line (code) or word (text) the key belongs to. */
  readonly unit: number;
  readonly expected: string;
  readonly typed: string;
  readonly ok: boolean;
};

export type KeyTrace = readonly Stamp[];

/** The line of the target that holds position `pos`. */
function lineAt(target: string, pos: number): number {
  return target.slice(0, pos).split("\n").length - 1;
}

/** `trace` plus the keys that took a code run from `before` to `after`. */
export function traceCode(
  trace: KeyTrace,
  before: TypingState,
  after: TypingState,
  now: number,
): KeyTrace {
  const keys = after.keystrokes - before.keystrokes;
  if (keys <= 0) return trace;
  const pos = before.typed.length;
  const inserted = after.typed.slice(pos);
  if (keys === 1) {
    // One key, even when Enter also inserted the indentation.
    const expected = after.target.slice(pos, pos + inserted.length);
    const ok = after.correct - before.correct === 1;
    return [...trace, { at: now, unit: lineAt(after.target, pos), expected, typed: inserted, ok }];
  }
  const stamps = [...inserted].map((typed, k): Stamp => {
    const expected = after.target[pos + k] as string;
    return {
      at: now,
      unit: lineAt(after.target, pos + k),
      expected,
      typed,
      ok: typed === expected,
    };
  });
  return [...trace, ...stamps];
}

/** `trace` plus the keys that took a text run from `before` to `after`. */
export function traceText(
  trace: KeyTrace,
  before: WordsState,
  after: WordsState,
  now: number,
): KeyTrace {
  const keys = after.keystrokes - before.keystrokes;
  if (keys <= 0) return trace;
  const unit = before.current;
  const allRight = after.correctKeystrokes - before.correctKeystrokes === keys;
  if (after.current !== unit) {
    return [...trace, { at: now, unit, expected: " ", typed: " ", ok: allRight }];
  }
  const target = [...(before.words[unit] as string)];
  const done = [...(before.inputs[unit] ?? "")].length;
  const stamps = [...(after.inputs[unit] as string)].slice(done).map((typed, k): Stamp => {
    const expected = target[done + k] ?? "";
    return { at: now, unit, expected, typed, ok: allRight || typed === expected };
  });
  return [...trace, ...stamps];
}

type UnitSummary = {
  readonly unit: number;
  readonly ok: boolean;
  readonly timeMs: number;
  /** Gaps between a key and the one before it. */
  readonly iv: number[];
  /** `[expected, typed]` of every key that typed the wrong character. */
  readonly bad: string[][];
};

/** One summary per unit that has keys, by unit. */
function summarizeUnits(trace: KeyTrace): UnitSummary[] {
  const groups = new Map<number, number[]>();
  trace.forEach((stamp, index) => {
    const group = groups.get(stamp.unit);
    if (group === undefined) groups.set(stamp.unit, [index]);
    else group.push(index);
  });
  const units = [...groups.keys()].sort((a, b) => a - b);
  let previousEnd: number | null = null;
  return units.map((unit): UnitSummary => {
    const indexes = groups.get(unit) as number[];
    const stamps = indexes.map((i) => trace[i] as Stamp);
    const last = stamps[stamps.length - 1] as Stamp;
    const start = previousEnd ?? (stamps[0] as Stamp).at;
    previousEnd = last.at;
    return {
      unit,
      ok: stamps.every((s) => s.ok),
      timeMs: last.at - start,
      iv: indexes
        .filter((i) => i > 0)
        .map((i) => (trace[i] as Stamp).at - (trace[i - 1] as Stamp).at),
      bad: stamps.filter((s) => !s.ok && s.expected !== s.typed).map((s) => [s.expected, s.typed]),
    };
  });
}

export type CodeMeta = {
  readonly at: number;
  /** The language. */
  readonly config: string;
  readonly seed: number;
  readonly snippetId: string;
  /** Full snippet text, used to count typeable characters per line without auto-indent. */
  readonly text?: string;
  /** Target WPM active during the round (T29 AC-4). */
  readonly target?: number;
};

/** One event per typed line. */
export function codeEvents(trace: KeyTrace, meta: CodeMeta): TrainingEvent[] {
  return summarizeUnits(trace).map((u) => ({
    at: meta.at,
    drill: "typing.code",
    config: meta.config,
    kc: "line",
    ok: u.ok,
    timeMs: u.timeMs,
    extra: { seed: meta.seed, i: u.unit, snippet: meta.snippetId, iv: u.iv, bad: u.bad },
  }));
}

export type TextMeta = {
  readonly at: number;
  /** The `textConfigKey` of the options. */
  readonly config: string;
  readonly seed: number;
  readonly words: readonly string[];
  /** Target WPM active during the round (T29 AC-4). */
  readonly target?: number;
};

/** One event per typed word. */
export function textEvents(trace: KeyTrace, meta: TextMeta): TrainingEvent[] {
  return summarizeUnits(trace).map((u) => ({
    at: meta.at,
    drill: "typing.text",
    config: meta.config,
    kc: "word",
    ok: u.ok,
    timeMs: u.timeMs,
    extra: { seed: meta.seed, i: u.unit, w: meta.words[u.unit] as string, iv: u.iv, bad: u.bad },
  }));
}
