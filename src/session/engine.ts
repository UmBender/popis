import type { Generator, Problem } from "../core/problem";

/** Zetamac's durations, in seconds. */
export const DURATIONS_S: readonly number[] = [30, 60, 120, 300, 600];
export const DEFAULT_DURATION_S = 120;

export type SessionConfig<P> = {
  readonly generator: Generator<P>;
  readonly params: P;
  readonly durationMs: number;
  /** Problem i uses `deriveSeed(seed, i)`. */
  readonly seed: number;
};

export type Outcome = "correct" | "skipped" | "timeout";

/** What happened to one problem. */
export type Attempt = {
  readonly problem: Problem;
  readonly outcome: Outcome;
  /** From the moment the problem was shown until it left the screen. */
  readonly timeMs: number;
  /** Edits that shortened the answer while this problem was shown. */
  readonly corrections: number;
};

export type RunningSession<P> = {
  readonly status: "running";
  readonly config: SessionConfig<P>;
  readonly startedAt: number;
  readonly problem: Problem;
  readonly shownAt: number;
  readonly input: string;
  readonly corrections: number;
  readonly score: number;
  readonly log: readonly Attempt[];
};

export type FinishedSession<P> = {
  readonly status: "finished";
  readonly config: SessionConfig<P>;
  readonly startedAt: number;
  readonly score: number;
  readonly log: readonly Attempt[];
};

export type SessionState<P> = RunningSession<P> | FinishedSession<P>;

export function startSession<P>(
  _config: SessionConfig<P>,
  _now: number,
): RunningSession<P> {
  throw new Error("todo");
}

/** The answer box now holds `text`; a correct answer moves to the next problem. */
export function typeAnswer<P>(
  _state: SessionState<P>,
  _text: string,
  _now: number,
): SessionState<P> {
  throw new Error("todo");
}

export function skipProblem<P>(
  _state: SessionState<P>,
  _now: number,
): SessionState<P> {
  throw new Error("todo");
}

/** Finishes the session once its time is up. */
export function tick<P>(_state: SessionState<P>, _now: number): SessionState<P> {
  throw new Error("todo");
}

export function remainingMs<P>(_state: SessionState<P>, _now: number): number {
  throw new Error("todo");
}
