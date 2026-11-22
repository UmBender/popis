import { describe, expect, it } from "vitest";
import { loadEvents, recordEvents } from "../storage/events";
import { memoryStore } from "../storage/history";
import { DRILLS, eventKey, type TrainingEvent } from "./event";

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
});
