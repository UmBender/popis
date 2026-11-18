import { describe, expect, it } from "vitest";
import { DEFAULT_ARITHMETIC } from "../gen/arithmetic";
import { arithmetic } from "../gen/arithmetic";
import {
  appendSession,
  DEFAULT_SETTINGS,
  HISTORY_KEY,
  loadHistory,
  loadSettings,
  MAX_SESSIONS,
  memoryStore,
  saveSettings,
  SETTINGS_KEY,
  type KeyValueStore,
  type SessionRecord,
} from "./history";

function record(finishedAt: number): SessionRecord {
  const problem = arithmetic.generate(finishedAt, DEFAULT_ARITHMETIC);
  return {
    version: 1,
    mode: "arithmetic",
    finishedAt,
    durationMs: 120_000,
    seed: finishedAt,
    params: DEFAULT_ARITHMETIC,
    log: [{ problem, outcome: "correct", timeMs: 1234, corrections: 1 }],
  };
}

const throwingStore: KeyValueStore = {
  getItem: () => {
    throw new Error("blocked");
  },
  setItem: () => {
    throw new Error("quota");
  },
};

describe("history", () => {
  it("empty store has no sessions", () => {
    expect(loadHistory(memoryStore())).toEqual([]);
  });

  it("appended sessions load back in order", () => {
    const store = memoryStore();
    appendSession(store, record(1));
    appendSession(store, record(2));
    expect(loadHistory(store)).toEqual([record(1), record(2)]);
  });

  it("corrupt JSON loads as empty and is replaced on append", () => {
    const store = memoryStore({ [HISTORY_KEY]: "{not json" });
    expect(loadHistory(store)).toEqual([]);
    appendSession(store, record(1));
    expect(loadHistory(store)).toEqual([record(1)]);
  });

  it("non-array JSON loads as empty", () => {
    expect(loadHistory(memoryStore({ [HISTORY_KEY]: '{"a":1}' }))).toEqual([]);
  });

  it("keeps only the last MAX_SESSIONS sessions", () => {
    const store = memoryStore();
    for (let i = 0; i < MAX_SESSIONS + 3; i++) appendSession(store, record(i));
    const history = loadHistory(store);
    expect(history).toHaveLength(MAX_SESSIONS);
    expect(history[0]?.finishedAt).toBe(3);
  });

  it("a store that throws does not break loading or saving", () => {
    expect(loadHistory(throwingStore)).toEqual([]);
    expect(() => {
      appendSession(throwingStore, record(1));
    }).not.toThrow();
  });
});

describe("settings", () => {
  it("defaults to the zetamac settings and 120 s", () => {
    expect(DEFAULT_SETTINGS).toEqual({ arithmetic: DEFAULT_ARITHMETIC, durationS: 120 });
    expect(loadSettings(memoryStore())).toEqual(DEFAULT_SETTINGS);
  });

  it("round-trips saved settings", () => {
    const store = memoryStore();
    const settings = {
      arithmetic: { ...DEFAULT_ARITHMETIC, operations: ["mul" as const] },
      durationS: 30,
    };
    saveSettings(store, settings);
    expect(loadSettings(store)).toEqual(settings);
  });

  it("invalid stored settings fall back to the defaults", () => {
    expect(loadSettings(memoryStore({ [SETTINGS_KEY]: "nope" }))).toEqual(DEFAULT_SETTINGS);
    expect(
      loadSettings(
        memoryStore({
          [SETTINGS_KEY]: JSON.stringify({ arithmetic: DEFAULT_ARITHMETIC, durationS: 45 }),
        }),
      ),
    ).toEqual(DEFAULT_SETTINGS);
    expect(
      loadSettings(
        memoryStore({
          [SETTINGS_KEY]: JSON.stringify({ arithmetic: { operations: [] }, durationS: 60 }),
        }),
      ),
    ).toEqual(DEFAULT_SETTINGS);
  });

  it("a store that throws gives the defaults and saving does not throw", () => {
    expect(loadSettings(throwingStore)).toEqual(DEFAULT_SETTINGS);
    expect(() => {
      saveSettings(throwingStore, DEFAULT_SETTINGS);
    }).not.toThrow();
  });
});
