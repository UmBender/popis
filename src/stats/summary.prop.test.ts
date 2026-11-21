import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { Drill, TrainingEvent } from "./event";
import { retire } from "./retention";
import { DAY_MS, mergeDaily, summarize } from "./summary";

const NOW = Date.UTC(2026, 10, 20, 15);

const eventArb = fc.record({
  at: fc.integer({ min: NOW - 200 * DAY_MS, max: NOW }),
  drill: fc.constantFrom<Drill>("calc", "vim.motion", "typing.text"),
  config: fc.constantFrom("a", "b"),
  kc: fc.constantFrom("x", "y", "z"),
  ok: fc.boolean(),
  timeMs: fc.integer({ min: 0, max: 60_000 }),
  seed: fc.integer({ min: 0, max: 1000 }),
});

const toEvent = (e: {
  at: number;
  drill: Drill;
  config: string;
  kc: string;
  ok: boolean;
  timeMs: number;
  seed: number;
}): TrainingEvent => ({
  at: e.at,
  drill: e.drill,
  config: e.config,
  kc: e.kc,
  ok: e.ok,
  timeMs: e.timeMs,
  extra: { seed: e.seed, i: 0 },
});

describe("daily rows", () => {
  it("curves from daily rows equal curves from raw events after retiring whole days", () => {
    fc.assert(
      fc.property(fc.array(eventArb, { maxLength: 60 }), (items) => {
        const events = items.map(toEvent).sort((a, b) => a.at - b.at);

        const { keep, old } = retire(events, NOW);
        const rows = mergeDaily(summarize(old), summarize(keep));

        expect(rows).toEqual(summarize(events));
      }),
    );
  });

  it("counts survive splitting a day between two summaries", () => {
    fc.assert(
      fc.property(fc.array(eventArb, { maxLength: 60 }), fc.nat(60), (items, cut) => {
        const events = items.map(toEvent).sort((a, b) => a.at - b.at);

        const rows = mergeDaily(summarize(events.slice(0, cut)), summarize(events.slice(cut)));

        const counts = (list: ReturnType<typeof summarize>) =>
          list.map((r) => [r.day, r.drill, r.config, r.kc, r.n, r.ok]);
        expect(counts(rows)).toEqual(counts(summarize(events)));
      }),
    );
  });
});
