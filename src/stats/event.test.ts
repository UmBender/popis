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

// T25 AC-5: gdb.cmd is accepted as a drill in DRILLS and round-trips through T22 storage.

describe("event drills", () => {
  it("DRILLS accepts gdb.cmd and stores gdb command events", () => {
    expect(DRILLS).toContain("gdb.cmd");
    const store = memoryStore();
    const at = Date.UTC(2026, 10, 21, 12);
    const ev: TrainingEvent = {
      at,
      drill: "gdb.cmd",
      config: "cmd",
      kc: "gdb.cmd.break-cond",
      ok: true,
      timeMs: 1850,
      extra: { seed: 42, i: 0, kind: "break-cond", skipped: false },
    };

    expect(eventKey(ev)).toBe(`${String(at)}|gdb.cmd|42|0`);
    expect(recordEvents(store, [ev], at)).toBe(true);
    expect(loadEvents(store)).toEqual([ev]);
  });

  it("DRILLS accepts gdb.out and stores gdb output events", () => {
    expect(DRILLS).toContain("gdb.out");
    const store = memoryStore();
    const at = Date.UTC(2026, 10, 22, 3);
    const ev: TrainingEvent = {
      at,
      drill: "gdb.out",
      config: "out-L1",
      kc: "gdb.out.formato",
      ok: true,
      timeMs: 2100,
      extra: { seed: 7, i: 0, kind: "formato", level: 1, skipped: false },
    };

    expect(eventKey(ev)).toBe(`${String(at)}|gdb.out|7|0`);
    expect(recordEvents(store, [ev], at)).toBe(true);
    expect(loadEvents(store)).toEqual([ev]);
  });

  it("DRILLS accepts compile.read and stores compile events", () => {
    expect(DRILLS).toContain("compile.read");
    const store = memoryStore();
    const at = Date.UTC(2026, 10, 25, 0);
    const ev: TrainingEvent = {
      at,
      drill: "compile.read",
      config: "90s",
      kc: "compile.asan",
      ok: true,
      timeMs: 3200,
      extra: { seed: 13, i: 0, caseId: "asan-heap-oob", group: "asan", lineOk: true, causeOk: true, skipped: false },
    };

    expect(eventKey(ev)).toBe(`${String(at)}|compile.read|13|0`);
    expect(recordEvents(store, [ev], at)).toBe(true);
    expect(loadEvents(store)).toEqual([ev]);
  });
});
