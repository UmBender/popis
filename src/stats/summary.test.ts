import { describe, expect, it } from "vitest";
import type { TrainingEvent } from "./event";
import {
  DAY_MS,
  dayOf,
  dayStart,
  mergeDaily,
  quartiles,
  summarize,
  unionDaily,
  type DailyRow,
} from "./summary";

function event(patch: Partial<TrainingEvent> & { at: number }): TrainingEvent {
  return {
    drill: "calc",
    config: "arithmetic",
    kc: "arithmetic.add",
    ok: true,
    timeMs: 1000,
    extra: { seed: 1, i: 0 },
    ...patch,
  };
}

const row = (patch: Partial<DailyRow> = {}): DailyRow => ({
  day: "2026-03-01",
  drill: "calc",
  config: "arithmetic",
  kc: "arithmetic.add",
  n: 2,
  ok: 1,
  q1: 100,
  median: 200,
  q3: 300,
  ...patch,
});

describe("dayOf", () => {
  it("dayOf handles epoch, leap days and negative times", () => {
    expect(dayOf(0)).toBe("1970-01-01");
    expect(dayOf(DAY_MS - 1)).toBe("1970-01-01");
    expect(dayOf(DAY_MS)).toBe("1970-01-02");
    expect(dayOf(-1)).toBe("1969-12-31");
    expect(dayOf(Date.UTC(2024, 1, 29, 23, 59, 59))).toBe("2024-02-29");
    expect(dayOf(Date.UTC(2026, 10, 20, 12))).toBe("2026-11-20");
    expect(dayOf(Date.UTC(2100, 2, 1))).toBe("2100-03-01");
  });

  it("dayStart is the midnight UTC of the day", () => {
    expect(dayStart(Date.UTC(2026, 10, 20, 12, 30))).toBe(Date.UTC(2026, 10, 20));
    expect(dayStart(-1)).toBe(-DAY_MS);
  });
});

describe("quartiles", () => {
  it("quartiles of one value are that value", () => {
    expect(quartiles([7])).toEqual([7, 7, 7]);
  });

  it("quartiles interpolate between sorted values", () => {
    expect(quartiles([40, 10, 30, 20])).toEqual([17.5, 25, 32.5]);
    expect(quartiles([1, 2, 3, 4, 5])).toEqual([2, 3, 4]);
  });
});

describe("summarize", () => {
  it("summarize groups by day drill config and kc", () => {
    const events = [
      event({ at: Date.UTC(2026, 2, 1, 10), timeMs: 100 }),
      event({ at: Date.UTC(2026, 2, 1, 11), timeMs: 300, ok: false }),
      event({ at: Date.UTC(2026, 2, 1, 12), kc: "arithmetic.mul", timeMs: 500 }),
      event({ at: Date.UTC(2026, 2, 1, 13), drill: "vim.edit", config: "edit", kc: "dd" }),
      event({ at: Date.UTC(2026, 2, 2, 9), timeMs: 900 }),
    ];

    const rows = summarize(events);

    expect(rows).toEqual([
      row({ drill: "calc", n: 2, ok: 1, q1: 150, median: 200, q3: 250 }),
      row({ kc: "arithmetic.mul", n: 1, ok: 1, q1: 500, median: 500, q3: 500 }),
      row({
        drill: "vim.edit",
        config: "edit",
        kc: "dd",
        n: 1,
        ok: 1,
        q1: 1000,
        median: 1000,
        q3: 1000,
      }),
      row({ day: "2026-03-02", n: 1, ok: 1, q1: 900, median: 900, q3: 900 }),
    ]);
  });

  it("summarize of nothing is empty", () => {
    expect(summarize([])).toEqual([]);
  });
});

describe("mergeDaily", () => {
  it("merge adds counts and weights quartiles", () => {
    const a = row({ n: 2, ok: 1, q1: 100, median: 200, q3: 300 });
    const b = row({ n: 6, ok: 6, q1: 200, median: 300, q3: 400 });

    expect(mergeDaily([a], [b])).toEqual([row({ n: 8, ok: 7, q1: 175, median: 275, q3: 375 })]);
  });

  it("merge keeps rows with different keys apart and sorted", () => {
    const later = row({ day: "2026-03-02" });
    const other = row({ kc: "arithmetic.mul" });
    const first = row();

    expect(mergeDaily([later], [other, first])).toEqual([first, other, later]);
  });
});

describe("unionDaily", () => {
  it("union keeps the row with the larger count for the same key", () => {
    const small = row({ n: 2 });
    const big = row({ n: 5 });
    const other = row({ kc: "arithmetic.mul" });

    expect(unionDaily([small], [big, other])).toEqual([big, other]);
    expect(unionDaily([big], [small])).toEqual([big]);
  });
});
