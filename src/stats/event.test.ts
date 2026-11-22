import { describe, expect, it } from "vitest";
import { loadEvents, recordEvents } from "../storage/events";
import { memoryStore } from "../storage/history";
import { DRILLS, eventKey, type TrainingEvent } from "./event";

describe("event", () => {
  it("DRILLS includes typing.weak and eventKey identifies weak events uniquely", () => {
    expect(DRILLS).toContain("typing.weak");
    const a: TrainingEvent = {
      at: 1000,
      drill: "typing.weak",
      config: "weak",
      kc: "typing.ngram.qu",
      ok: true,
      timeMs: 320,
      extra: { seed: 7, i: 0, w: "quick", iv: [80, 80, 80, 80], bad: [] },
    };
    const b: TrainingEvent = {
      ...a,
      extra: { ...a.extra, i: 1 },
    };
    expect(eventKey(a)).toBe("1000|typing.weak|7|0");
    expect(eventKey(b)).toBe("1000|typing.weak|7|1");
  });

  it("recordEvents and loadEvents round-trip typing.weak events with typing.ngram kc", () => {
    const store = memoryStore();
    const now = Date.UTC(2026, 10, 22, 12);
    const ev: TrainingEvent = {
      at: now - 1000,
      drill: "typing.weak",
      config: "weak",
      kc: "typing.ngram.->",
      ok: true,
      timeMs: 280,
      extra: { seed: 11, i: 0, w: "p->next", iv: [90, 95, 95], bad: [], target: 50, onPace: true },
    };

    expect(recordEvents(store, [ev], now)).toBe(true);
    expect(loadEvents(store)).toEqual([ev]);
  });
});
