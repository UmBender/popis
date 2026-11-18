import type { Generator, Problem } from "../core/problem";
import { deriveSeed } from "../core/rng";

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

function problemAt<P>(config: SessionConfig<P>, index: number): Problem {
  return config.generator.generate(deriveSeed(config.seed, index), config.params);
}

function endsAt<P>(state: SessionState<P>): number {
  return state.startedAt + state.config.durationMs;
}

export function startSession<P>(config: SessionConfig<P>, now: number): RunningSession<P> {
  return {
    status: "running",
    config,
    startedAt: now,
    problem: problemAt(config, 0),
    shownAt: now,
    input: "",
    corrections: 0,
    score: 0,
    log: [],
  };
}

/** Logs the current problem with `outcome` and shows the next one. */
function advance<P>(
  state: RunningSession<P>,
  outcome: Outcome,
  corrections: number,
  now: number,
): RunningSession<P> {
  const attempt: Attempt = {
    problem: state.problem,
    outcome,
    timeMs: now - state.shownAt,
    corrections,
  };
  const log = [...state.log, attempt];
  return {
    ...state,
    problem: problemAt(state.config, log.length),
    shownAt: now,
    input: "",
    corrections: 0,
    score: state.score + (outcome === "correct" ? 1 : 0),
    log,
  };
}

/** Finishes the session once its time is up; the open problem times out. */
export function tick<P>(state: SessionState<P>, now: number): SessionState<P> {
  if (state.status === "finished" || now < endsAt(state)) return state;
  const end = endsAt(state);
  const timeout: Attempt = {
    problem: state.problem,
    outcome: "timeout",
    timeMs: Math.max(0, end - state.shownAt),
    corrections: state.corrections,
  };
  return {
    status: "finished",
    config: state.config,
    startedAt: state.startedAt,
    score: state.score,
    log: [...state.log, timeout],
  };
}

/** The answer box now holds `text`; a correct answer moves to the next problem. */
export function typeAnswer<P>(state: SessionState<P>, text: string, now: number): SessionState<P> {
  const current = tick(state, now);
  if (current.status === "finished") return current;
  const corrections = current.corrections + (text.length < current.input.length ? 1 : 0);
  if (current.config.generator.check(current.problem, text)) {
    return advance(current, "correct", corrections, now);
  }
  return { ...current, input: text, corrections };
}

export function skipProblem<P>(state: SessionState<P>, now: number): SessionState<P> {
  const current = tick(state, now);
  if (current.status === "finished") return current;
  return advance(current, "skipped", current.corrections, now);
}

export function remainingMs<P>(state: SessionState<P>, now: number): number {
  if (state.status === "finished") return 0;
  return Math.max(0, endsAt(state) - now);
}
