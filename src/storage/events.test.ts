import { describe, expect, it } from "vitest";
import { arithmetic, DEFAULT_ARITHMETIC } from "../gen/arithmetic";
import { RAW_DAYS } from "../stats/retention";
import type { TrainingEvent } from "../stats/event";
import { DAY_MS, dayStart } from "../stats/summary";
import { clearQuotaNotice, DAILY_KEY, loadDaily, quotaNoticePending } from "./daily";
import { EVENTS_BUDGET, EVENTS_KEY, loadAllEvents, loadEvents, recordEvents } from "./events";
import {
  appendSession,
  HISTORY_BUDGET,
  HISTORY_KEY,
  loadHistory,
  MAX_SESSIONS,
  memoryStore,
  type KeyValueStore,
  type SessionRecord,
} from "./history";

const NOW = Date.UTC(2026, 10, 20, 15);

function event(at: number, i = 0, patch: Partial<TrainingEvent> = {}): TrainingEvent {
  return {
    at,
    drill: "vim.edit",
    config: "edit",
    kc: "dd",
    ok: true,
    timeMs: 1000,
    extra: { seed: 5, i },
    ...patch,
  };
}

/** A store that throws once the total size of its values passes `capacity`. */
function quotaStore(capacity: number): KeyValueStore {
  const data = new Map<string, string>();
  const used = (except: string) =>
    [...data].reduce((sum, [k, v]) => (k === except ? sum : sum + k.length + v.length), 0);
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      if (used(key) + key.length + value.length > capacity) throw new Error("QuotaExceededError");
      data.set(key, value);
    },
  };
}

function session(finishedAt: number, attempts = 1): SessionRecord {
  const log = Array.from({ length: attempts }, (_, i) => ({
    problem: arithmetic.generate(finishedAt * 1000 + i, DEFAULT_ARITHMETIC),
    outcome: "correct" as const,
    timeMs: 1234,
    corrections: 0,
  }));
  return {
    version: 1,
    mode: "arithmetic",
    finishedAt,
    durationMs: 120_000,
    seed: finishedAt,
    params: DEFAULT_ARITHMETIC,
    log,
  };
}

describe("recordEvents", () => {
  it("recorded events load back in order", () => {
    const store = memoryStore();

    recordEvents(store, [event(NOW - 2000, 1), event(NOW - 3000, 0)], NOW);
    recordEvents(store, [event(NOW - 1000, 2)], NOW);

    expect(loadEvents(store).map((e) => e.extra["i"])).toEqual([0, 1, 2]);
  });

  it("recording the same events twice keeps one copy", () => {
    const store = memoryStore();
    const events = [event(NOW - 1000, 0), event(NOW - 1000, 1)];

    recordEvents(store, events, NOW);
    recordEvents(store, events, NOW);

    expect(loadEvents(store)).toEqual(events);
  });

  it("recording events keeps 90 days raw and summarizes the rest", () => {
    const store = memoryStore();
    const old = event(dayStart(NOW) - RAW_DAYS * DAY_MS - 5000, 0, { timeMs: 400 });
    const recent = event(NOW - 1000, 1);

    const done = recordEvents(store, [old, recent], NOW);

    expect(done).toBe(true);
    expect(loadEvents(store)).toEqual([recent]);
    expect(loadDaily(store)).toEqual([
      {
        day: "2026-08-21",
        drill: "vim.edit",
        config: "edit",
        kc: "dd",
        n: 1,
        ok: 1,
        q1: 400,
        median: 400,
        q3: 400,
      },
    ]);
  });

  it("events over the budget move their oldest days to the daily rows", () => {
    const store = memoryStore();
    const days = 60;
    const perDay = 200;
    const events = Array.from({ length: days * perDay }, (_, k) =>
      event(NOW - (days - Math.floor(k / perDay)) * DAY_MS, k),
    );

    recordEvents(store, events, NOW);

    const raw = loadEvents(store);
    const counted = raw.length + loadDaily(store).reduce((sum, r) => sum + r.n, 0);
    expect((store.getItem(EVENTS_KEY) as string).length).toBeLessThanOrEqual(EVENTS_BUDGET);
    expect(raw.length).toBeLessThan(events.length);
    expect(counted).toBe(events.length);
  });

  it("a full store makes events summarize early and keeps the current round", () => {
    const store = quotaStore(12_000);
    let total = 0;
    let last: TrainingEvent[] = [];

    for (let k = 0; k < 40; k++) {
      last = Array.from({ length: 10 }, (_, i) => event(NOW - (45 - k) * DAY_MS + i, i));
      recordEvents(store, last, NOW);
      total += last.length;
    }

    const raw = loadEvents(store);
    const counted = raw.length + loadDaily(store).reduce((sum, r) => sum + r.n, 0);
    expect(counted).toBe(total);
    expect(raw.length).toBeLessThan(total);
    expect(raw.slice(-last.length)).toEqual(last);
  });

  it("the quota notice is pending once", () => {
    const store = quotaStore(6000);
    expect(quotaNoticePending(store)).toBe(false);
    const day = (k: number) => NOW - (60 - k) * DAY_MS;

    const batch = (k: number) => [0, 1, 2, 3, 4].map((i) => event(day(k), i));

    for (let k = 0; k < 30; k++) recordEvents(store, batch(k), NOW);
    expect(quotaNoticePending(store)).toBe(true);

    clearQuotaNotice(store);
    expect(quotaNoticePending(store)).toBe(false);
    for (let k = 30; k < 60; k++) recordEvents(store, batch(k), NOW);
    expect(quotaNoticePending(store)).toBe(false);
  });

  it("recording on a broken store does not throw and reports failure", () => {
    const broken: KeyValueStore = {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
    };

    expect(recordEvents(broken, [event(NOW)], NOW)).toBe(false);
  });

  it("corrupt stored events and rows load as nothing", () => {
    const store = memoryStore({
      [EVENTS_KEY]: '[[1,"calc"],"x",null]',
      [DAILY_KEY]: '[{"day":1},5]',
    });

    expect(loadEvents(store)).toEqual([]);
    expect(loadDaily(store)).toEqual([]);
    const bad = (extra: unknown) =>
      loadEvents(
        memoryStore({ [EVENTS_KEY]: JSON.stringify([[1, "vim.edit", "edit", "dd", 1, 5, extra]]) }),
      );
    expect(bad("x")).toEqual([]);
    expect(bad(null)).toEqual([]);
    expect(bad({ i: 0 })).toEqual([]);
    expect(bad({ seed: 1 })).toEqual([]);
    expect(bad({ seed: 1, i: 0 })).toHaveLength(1);
    expect(loadEvents(memoryStore({ [EVENTS_KEY]: "{" }))).toEqual([]);
    expect(loadDaily(memoryStore({ [DAILY_KEY]: "{}" }))).toEqual([]);
  });
});

describe("loadAllEvents", () => {
  it("loadAllEvents joins session events and recorded events by time", () => {
    const store = memoryStore();
    appendSession(store, session(NOW - 5000));
    recordEvents(store, [event(NOW - 9000), event(NOW - 1000)], NOW);

    const all = loadAllEvents(store);

    expect(all.map((e) => e.drill)).toEqual(["vim.edit", "calc", "vim.edit"]);
    expect(all.map((e) => e.at)).toEqual([NOW - 9000, NOW - 5000, NOW - 1000]);
  });
});

describe("history overflow", () => {
  it("history overflow turns dropped sessions into daily rows", () => {
    const store = memoryStore();

    for (let k = 1; k <= MAX_SESSIONS + 2; k++) appendSession(store, session(k));

    expect(loadHistory(store)).toHaveLength(MAX_SESSIONS);
    const rows = loadDaily(store);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ day: "1970-01-01", drill: "calc", n: 2, ok: 2 });
  });

  it("history over the size budget drops its oldest sessions into daily rows", () => {
    const store = memoryStore();
    const appended = 70;

    for (let k = 1; k <= appended; k++) appendSession(store, session(k, 100));

    const history = loadHistory(store);
    const inHistory = history.reduce((sum, s) => sum + s.log.length, 0);
    const inRows = loadDaily(store).reduce((sum, r) => sum + r.n, 0);
    expect((store.getItem(HISTORY_KEY) as string).length).toBeLessThanOrEqual(HISTORY_BUDGET);
    expect(history.length).toBeLessThan(appended);
    expect(inHistory + inRows).toBe(appended * 100);
  });

  it("a full store drops old sessions to fit the new one and warns", () => {
    const store = quotaStore(30_000);

    for (let k = 1; k <= 12; k++) appendSession(store, session(k, 20));

    const history = loadHistory(store);
    expect(history.at(-1)?.finishedAt).toBe(12);
    expect(history.length).toBeLessThan(12);
    expect(quotaNoticePending(store)).toBe(true);
    const inRows = loadDaily(store).reduce((sum, r) => sum + r.n, 0);
    expect(history.reduce((sum, s) => sum + s.log.length, 0) + inRows).toBe(12 * 20);
  });
});
