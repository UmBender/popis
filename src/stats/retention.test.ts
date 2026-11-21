import { describe, expect, it } from "vitest";
import type { TrainingEvent } from "./event";
import { fitBudget, RAW_DAYS, retire } from "./retention";
import { DAY_MS, dayStart } from "./summary";

const NOW = Date.UTC(2026, 10, 20, 15);

function event(at: number): TrainingEvent {
  return {
    at,
    drill: "vim.edit",
    config: "edit",
    kc: "dd",
    ok: true,
    timeMs: 1000,
    extra: { seed: at, i: 0 },
  };
}

describe("retire", () => {
  it("retire moves events older than 90 days", () => {
    const cutoff = dayStart(NOW) - RAW_DAYS * DAY_MS;
    const old = [event(cutoff - 1), event(cutoff - DAY_MS)];
    const recent = [event(cutoff), event(NOW)];

    const { keep, old: moved } = retire([...old, ...recent], NOW);

    expect(moved).toEqual(old);
    expect(keep).toEqual(recent);
  });

  it("retire of nothing is nothing", () => {
    expect(retire([], NOW)).toEqual({ keep: [], old: [] });
  });
});

describe("fit", () => {
  const sizeOf = (events: readonly TrainingEvent[]): number => events.length * 10;
  const day = (n: number, count: number): TrainingEvent[] =>
    Array.from({ length: count }, (_, k) => event(n * DAY_MS + k * 1000));

  it("fit keeps everything that is within the budget", () => {
    const events = [...day(1, 2), ...day(2, 2)];

    expect(fitBudget(events, 40, sizeOf)).toEqual({ keep: events, old: [] });
  });

  it("fit moves the oldest whole days until the budget holds", () => {
    const events = [...day(1, 3), ...day(2, 2), ...day(3, 2)];

    const { keep, old } = fitBudget(events, 40, sizeOf);

    expect(old).toEqual(day(1, 3));
    expect(keep).toEqual([...day(2, 2), ...day(3, 2)]);
  });

  it("fit moves everything when even the newest day is over the budget", () => {
    const events = [...day(1, 1), ...day(2, 5)];

    const { keep, old } = fitBudget(events, 10, sizeOf);

    expect(keep).toEqual([]);
    expect(old).toEqual(events);
  });
});
