import { describe, expect, it } from "vitest";
import { deriveSeed } from "../core/rng";
import { arithmetic, DEFAULT_ARITHMETIC, type ArithmeticSettings } from "../gen/arithmetic";
import {
  DEFAULT_DURATION_S,
  DURATIONS_S,
  remainingMs,
  skipProblem,
  startSession,
  tick,
  typeAnswer,
  type RunningSession,
  type SessionConfig,
  type SessionState,
} from "./engine";

/** Always "1 + 1": the answer is "2". */
const ONE_PLUS_ONE: ArithmeticSettings = {
  ...DEFAULT_ARITHMETIC,
  operations: ["add"],
  addLeft: { min: 1, max: 1 },
  addRight: { min: 1, max: 1 },
};

function config(patch: Partial<SessionConfig<ArithmeticSettings>> = {}) {
  return {
    generator: arithmetic,
    params: ONE_PLUS_ONE,
    durationMs: 60_000,
    seed: 5,
    ...patch,
  };
}

function running<P>(state: SessionState<P>) {
  if (state.status !== "running") throw new Error("expected a running session");
  return state;
}

describe("durations", () => {
  it("offers the zetamac durations with 120 s as default", () => {
    expect(DURATIONS_S).toEqual([30, 60, 120, 300, 600]);
    expect(DEFAULT_DURATION_S).toBe(120);
  });
});

describe("startSession", () => {
  it("shows the problem generated from the derived seed of index 0", () => {
    const state = startSession(config({ params: DEFAULT_ARITHMETIC }), 1000);
    expect(state.problem).toEqual(arithmetic.generate(deriveSeed(5, 0), DEFAULT_ARITHMETIC));
    expect(state.score).toBe(0);
    expect(state.input).toBe("");
    expect(state.log).toEqual([]);
  });

  it("same seed gives the same problem sequence", () => {
    const play = () => {
      let state: SessionState<ArithmeticSettings> = startSession(
        config({ params: DEFAULT_ARITHMETIC }),
        0,
      );
      const prompts: string[] = [];
      for (let i = 0; i < 10; i++) {
        const current: RunningSession<ArithmeticSettings> = running(state);
        prompts.push(current.problem.prompt);
        state = typeAnswer(current, current.problem.answer, i + 1);
      }
      return prompts;
    };
    expect(play()).toEqual(play());
  });
});

describe("typeAnswer", () => {
  it("correct answer is accepted without submit and advances", () => {
    const start = startSession(config(), 0);
    const next = running(typeAnswer(start, "2", 800));
    expect(next.score).toBe(1);
    expect(next.input).toBe("");
    expect(next.problem.seed).toBe(deriveSeed(5, 1));
    expect(next.log).toHaveLength(1);
    expect(next.log[0]?.outcome).toBe("correct");
  });

  it("wrong or partial input keeps the problem", () => {
    const start = startSession(config(), 0);
    const next = running(typeAnswer(start, "3", 500));
    expect(next.score).toBe(0);
    expect(next.input).toBe("3");
    expect(next.problem).toEqual(start.problem);
    expect(next.log).toEqual([]);
  });

  it("time per problem is measured from when it was shown", () => {
    let state = running(typeAnswer(startSession(config(), 1000), "2", 2500));
    state = running(typeAnswer(state, "2", 2900));
    expect(state.log.map((a) => a.timeMs)).toEqual([1500, 400]);
  });

  it("corrections count edits that shorten the input", () => {
    let state = startSession(config(), 0);
    state = running(typeAnswer(state, "3", 100));
    state = running(typeAnswer(state, "", 200));
    state = running(typeAnswer(state, "1", 300));
    state = running(typeAnswer(state, "", 400));
    state = running(typeAnswer(state, "2", 500));
    expect(state.log[0]?.corrections).toBe(2);
  });

  it("corrections reset for the next problem", () => {
    let state = startSession(config(), 0);
    state = running(typeAnswer(state, "3", 100));
    state = running(typeAnswer(state, "", 200));
    state = running(typeAnswer(state, "2", 300));
    state = running(typeAnswer(state, "2", 400));
    expect(state.log.map((a) => a.corrections)).toEqual([1, 0]);
  });

  it("input after the end finishes the session and is ignored", () => {
    const start = startSession(config({ durationMs: 1000 }), 0);
    const end = typeAnswer(start, "2", 1000);
    expect(end.status).toBe("finished");
    expect(end.score).toBe(0);
  });
});

describe("skipProblem", () => {
  it("logs a skipped attempt and advances", () => {
    const start = startSession(config(), 0);
    const next = running(skipProblem(start, 300));
    expect(next.score).toBe(0);
    expect(next.log).toEqual([
      { problem: start.problem, outcome: "skipped", timeMs: 300, corrections: 0 },
    ]);
    expect(next.problem.seed).toBe(deriveSeed(5, 1));
  });
});

describe("tick and the end of the session", () => {
  it("session finishes exactly at the duration", () => {
    const start = startSession(config({ durationMs: 30_000 }), 1000);
    expect(tick(start, 30_999).status).toBe("running");
    expect(tick(start, 31_000).status).toBe("finished");
  });

  it("open problem is logged as timeout at the end", () => {
    let state = startSession(config({ durationMs: 10_000 }), 0);
    state = running(typeAnswer(state, "2", 4000));
    state = running(typeAnswer(state, "1", 5000));
    const end = tick(state, 12_000);
    expect(end.status).toBe("finished");
    expect(end.log.map((a) => [a.outcome, a.timeMs, a.corrections])).toEqual([
      ["correct", 4000, 0],
      ["timeout", 6000, 0],
    ]);
  });

  it("finished session keeps score and ignores further events", () => {
    let state: SessionState<ArithmeticSettings> = startSession(config({ durationMs: 1000 }), 0);
    state = typeAnswer(running(state), "2", 500);
    const end = tick(state, 2000);
    expect(end.score).toBe(1);
    expect(tick(end, 3000)).toBe(end);
    expect(typeAnswer(end, "2", 3000)).toBe(end);
    expect(skipProblem(end, 3000)).toBe(end);
  });

  it("remainingMs counts down and never goes below zero", () => {
    const start = startSession(config({ durationMs: 30_000 }), 1000);
    expect(remainingMs(start, 1000)).toBe(30_000);
    expect(remainingMs(start, 11_000)).toBe(20_000);
    expect(remainingMs(start, 99_000)).toBe(0);
    expect(remainingMs(tick(start, 99_000), 99_000)).toBe(0);
  });
});
