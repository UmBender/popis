import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { arithmetic, DEFAULT_ARITHMETIC } from "../gen/arithmetic";
import { skipProblem, startSession, tick, typeAnswer, type SessionState } from "../session/engine";
import { summarize } from "../session/stats";
import type { EditResult } from "../vim/edit-round";
import { editRoundStats } from "../vim/edit-round";
import { roundStats, type TargetResult } from "../vim/round";
import { editEvents, motionEvents, sessionEvents } from "./derive";
import { eventKey } from "./event";

describe("events add up to the result", () => {
  it("events of a calc session add up to the session score", () => {
    const action = fc.constantFrom("solve", "skip", "wait");
    fc.assert(
      fc.property(fc.integer(), fc.array(action, { maxLength: 40 }), (seed, actions) => {
        let t = 0;
        let state: SessionState<typeof DEFAULT_ARITHMETIC> = startSession(
          { generator: arithmetic, params: DEFAULT_ARITHMETIC, durationMs: 60_000, seed },
          t,
        );
        for (const a of actions) {
          t += 1500;
          if (state.status === "finished") break;
          if (a === "solve") state = typeAnswer(state, state.problem.answer, t);
          else if (a === "skip") state = skipProblem(state, t);
        }
        state = tick(state, t + 120_000);

        const events = sessionEvents({ mode: "arithmetic", finishedAt: t, log: state.log });

        expect(events.filter((e) => e.ok)).toHaveLength(state.score);
        expect(events).toHaveLength(state.log.length);
        expect(events.filter((e) => e.ok)).toHaveLength(summarize(state.log).score);
        expect(new Set(events.map(eventKey)).size).toBe(events.length);
      }),
    );
  });

  const target = fc.record({
    seed: fc.integer(),
    keys: fc.integer({ min: 0, max: 30 }),
    minimum: fc.integer({ min: 1, max: 10 }),
    timeMs: fc.integer({ min: 0, max: 60_000 }),
    skipped: fc.boolean(),
  });

  it("events of a vim round add up to the round stats", () => {
    fc.assert(
      fc.property(fc.array(target, { maxLength: 30 }), (items) => {
        const results: TargetResult[] = items.map((r, index) => ({
          ...r,
          index,
          snippetId: "s",
          solution: "fx;",
        }));
        const round = { config: { level: 3 as const, durationMs: 60_000, seed: 1 }, results };

        const events = motionEvents(round, 1000);
        const stats = roundStats(round);

        expect(events.filter((e) => e.ok)).toHaveLength(stats.reached);
        expect(events.filter((e) => !e.ok)).toHaveLength(stats.skipped);
      }),
    );
  });

  it("events of a vim edit round add up to the round stats", () => {
    fc.assert(
      fc.property(fc.array(target, { maxLength: 30 }), (items) => {
        const results: EditResult[] = items.map(({ minimum, ...r }, index) => ({
          ...r,
          index,
          kind: "delete-word",
          snippetId: "s",
          referenceKeys: minimum,
          reference: "dw",
        }));

        const events = editEvents({ results }, 1000);
        const stats = editRoundStats({ results });

        expect(events.filter((e) => e.ok)).toHaveLength(stats.reached);
        expect(events.filter((e) => !e.ok)).toHaveLength(stats.skipped);
      }),
    );
  });
});
