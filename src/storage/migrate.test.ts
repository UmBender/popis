import { describe, expect, it } from "vitest";
import { arithmetic, DEFAULT_ARITHMETIC } from "../gen/arithmetic";
import { RAW_DAYS } from "../stats/retention";
import { DAY_MS, dayStart } from "../stats/summary";
import { loadDaily } from "./daily";
import { EVENTS_KEY, loadAllEvents, loadEvents } from "./events";
import {
  HISTORY_BUDGET,
  HISTORY_KEY,
  loadHistory,
  memoryStore,
  type KeyValueStore,
  type SessionRecord,
} from "./history";
import { MIGRATED_KEY, migrate } from "./migrate";
import { TEXT_TYPING_KEY } from "./text-typing";
import { TYPING_KEY } from "./typing";
import { VIM_KEY } from "./vim";

const NOW = Date.UTC(2026, 10, 20, 15);
const RECENT = NOW - 3 * DAY_MS;

const motion = {
  version: 1,
  level: 2,
  durationS: 60,
  seed: 7,
  reached: 12,
  skipped: 1,
  efficiency: 0.8,
  finishedAt: RECENT,
};
const edit = {
  version: 1,
  kind: "edit",
  durationS: 30,
  seed: 8,
  reached: 5,
  skipped: 0,
  efficiency: 1.1,
  finishedAt: RECENT + 1000,
};
const typing = {
  version: 1,
  snippetId: "cpp-3",
  language: "cpp",
  seed: 9,
  wpm: 42.5,
  accuracy: 0.97,
  errors: 3,
  timeMs: 51_000,
  finishedAt: RECENT + 2000,
};
const text = {
  version: 1,
  config: "pt-30",
  seed: 10,
  wpm: 55,
  raw: 60,
  accuracy: 0.95,
  chars: { correct: 100, incorrect: 3, extra: 1, missed: 0 },
  timeMs: 30_000,
  finishedAt: RECENT + 3000,
};

const old = (result: object, ago: number) => ({
  ...result,
  finishedAt: dayStart(NOW) - ago * DAY_MS - 1000,
});

function oldData(): KeyValueStore {
  return memoryStore({
    [VIM_KEY]: JSON.stringify([motion, edit]),
    [TYPING_KEY]: JSON.stringify([typing]),
    [TEXT_TYPING_KEY]: JSON.stringify([text]),
  });
}

describe("migrate", () => {
  it("migrates old vim motion and edit rounds to round events", () => {
    const store = oldData();

    expect(migrate(store, NOW)).toBe(true);

    const events = loadEvents(store).filter((e) => e.drill.startsWith("vim"));
    expect(events).toEqual([
      {
        at: RECENT,
        drill: "vim.motion",
        config: "L2",
        kc: "round",
        ok: true,
        timeMs: 60_000,
        extra: { seed: 7, i: 0, legacy: true, reached: 12, skipped: 1, efficiency: 0.8 },
      },
      {
        at: RECENT + 1000,
        drill: "vim.edit",
        config: "edit",
        kc: "round",
        ok: true,
        timeMs: 30_000,
        extra: { seed: 8, i: 0, legacy: true, reached: 5, skipped: 0, efficiency: 1.1 },
      },
    ]);
  });

  it("migrates old typing results", () => {
    const store = oldData();

    migrate(store, NOW);

    expect(loadEvents(store).filter((e) => e.drill === "typing.code")).toEqual([
      {
        at: RECENT + 2000,
        drill: "typing.code",
        config: "cpp",
        kc: "round",
        ok: true,
        timeMs: 51_000,
        extra: {
          seed: 9,
          i: 0,
          legacy: true,
          snippet: "cpp-3",
          wpm: 42.5,
          accuracy: 0.97,
          errors: 3,
        },
      },
    ]);
  });

  it("migrates old text results", () => {
    const store = oldData();

    migrate(store, NOW);

    expect(loadEvents(store).filter((e) => e.drill === "typing.text")).toEqual([
      {
        at: RECENT + 3000,
        drill: "typing.text",
        config: "pt-30",
        kc: "round",
        ok: true,
        timeMs: 30_000,
        extra: {
          seed: 10,
          i: 0,
          legacy: true,
          wpm: 55,
          raw: 60,
          accuracy: 0.95,
          chars: { correct: 100, incorrect: 3, extra: 1, missed: 0 },
        },
      },
    ]);
  });

  it("old rounds beyond 90 days become daily rows", () => {
    const store = memoryStore({
      [VIM_KEY]: JSON.stringify([old(motion, RAW_DAYS + 5), motion]),
    });

    migrate(store, NOW);

    expect(loadEvents(store)).toHaveLength(1);
    expect(loadDaily(store)).toMatchObject([
      { drill: "vim.motion", config: "L2", kc: "round", n: 1, ok: 1 },
    ]);
  });

  it("keeps the old keys and writes the marker", () => {
    const store = oldData();
    const before = store.getItem(VIM_KEY);

    migrate(store, NOW);

    expect(store.getItem(VIM_KEY)).toBe(before);
    expect(store.getItem(TYPING_KEY)).not.toBeNull();
    expect(store.getItem(TEXT_TYPING_KEY)).not.toBeNull();
    expect(store.getItem(MIGRATED_KEY)).not.toBeNull();
  });

  it("runs only once", () => {
    const store = oldData();
    migrate(store, NOW);
    const first = store.getItem(EVENTS_KEY);

    expect(migrate(store, NOW)).toBe(false);

    expect(store.getItem(EVENTS_KEY)).toBe(first);
  });

  it("a failing write leaves no marker so it runs again", () => {
    const inner = oldData();
    let failing = true;
    const store: KeyValueStore = {
      getItem: (key) => inner.getItem(key),
      setItem: (key, value) => {
        if (failing) throw new Error("quota");
        inner.setItem(key, value);
      },
    };

    expect(migrate(store, NOW)).toBe(false);
    expect(inner.getItem(MIGRATED_KEY)).toBeNull();

    failing = false;
    expect(migrate(store, NOW)).toBe(true);
    expect(loadEvents(inner)).toHaveLength(4);
  });

  it("ignores corrupt old data", () => {
    const store = memoryStore({
      [VIM_KEY]: "{",
      [TYPING_KEY]: '[{"version":1}]',
      [TEXT_TYPING_KEY]: "null",
    });

    expect(migrate(store, NOW)).toBe(true);

    expect(loadEvents(store)).toEqual([]);
    expect(store.getItem(MIGRATED_KEY)).not.toBeNull();
  });

  it("migrating an empty store writes only the marker", () => {
    const store = memoryStore();

    expect(migrate(store, NOW)).toBe(true);

    expect(store.getItem(EVENTS_KEY)).toBeNull();
    expect(store.getItem(MIGRATED_KEY)).not.toBeNull();
  });

  it("an old history over the size budget is trimmed into daily rows", () => {
    const big = (finishedAt: number): SessionRecord => ({
      version: 1,
      mode: "arithmetic",
      finishedAt,
      durationMs: 120_000,
      seed: finishedAt,
      params: DEFAULT_ARITHMETIC,
      log: Array.from({ length: 100 }, (_, i) => ({
        problem: arithmetic.generate(finishedAt * 1000 + i, DEFAULT_ARITHMETIC),
        outcome: "correct" as const,
        timeMs: 1000,
        corrections: 0,
      })),
    });
    const sessions = Array.from({ length: 100 }, (_, k) => big(NOW - (100 - k) * 60_000));
    const store = memoryStore({ [HISTORY_KEY]: JSON.stringify(sessions) });

    migrate(store, NOW);

    const kept = loadHistory(store);
    expect((store.getItem(HISTORY_KEY) as string).length).toBeLessThanOrEqual(HISTORY_BUDGET);
    expect(kept.length).toBeLessThan(sessions.length);
    const inRows = loadDaily(store).reduce((sum, r) => sum + r.n, 0);
    expect(kept.length * 100 + inRows).toBe(sessions.length * 100);
    expect(loadAllEvents(store).filter((e) => e.drill === "calc")).toHaveLength(kept.length * 100);
  });
});
