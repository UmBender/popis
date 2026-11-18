import { describe, expect, it } from "vitest";
import { DEFAULT_ARITHMETIC } from "../gen/arithmetic";
import { arithmetic } from "../gen/arithmetic";
import { DEFAULT_FACTORING, factoring } from "../gen/factoring";
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
  type StoredSettings,
} from "./history";
import { DIVISION_KINDS } from "../gen/division";
import { MODE_IDS, MODES } from "../modes";

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

  it("factoring sessions keep their mode", () => {
    const store = memoryStore();
    const problem = factoring.generate(1, DEFAULT_FACTORING);
    const session: SessionRecord = {
      version: 1,
      mode: "factoring",
      finishedAt: 1,
      durationMs: 60_000,
      seed: 1,
      params: DEFAULT_FACTORING,
      log: [{ problem, outcome: "skipped", timeMs: 900, corrections: 0 }],
    };
    appendSession(store, session);
    expect(loadHistory(store)).toEqual([session]);
  });

  it("a store that throws does not break loading or saving", () => {
    expect(loadHistory(throwingStore)).toEqual([]);
    expect(() => {
      appendSession(throwingStore, record(1));
    }).not.toThrow();
  });
});

describe("settings", () => {
  // T02 (AC-7) added `mode` and `factoring`; T04 (AC-3) added `division` and
  // made each mode's defaults come from the mode registry.
  it("defaults to arithmetic for 120 s, with each mode's registry defaults", () => {
    expect(DEFAULT_SETTINGS.mode).toBe("arithmetic");
    expect(DEFAULT_SETTINGS.durationS).toBe(120);
    expect(DEFAULT_SETTINGS.arithmetic).toEqual(DEFAULT_ARITHMETIC);
    expect(DEFAULT_SETTINGS.factoring).toEqual({ levels: [1] });
    expect(DEFAULT_SETTINGS.division).toEqual({ kinds: DIVISION_KINDS });
    for (const id of MODE_IDS) expect(DEFAULT_SETTINGS[id]).toEqual(MODES[id].defaults);
    expect(loadSettings(memoryStore())).toEqual(DEFAULT_SETTINGS);
  });

  it("round-trips saved settings", () => {
    const store = memoryStore();
    const settings: StoredSettings = {
      ...DEFAULT_SETTINGS,
      mode: "division",
      arithmetic: { ...DEFAULT_ARITHMETIC, operations: ["mul"] },
      factoring: { levels: [2, 4] },
      division: { kinds: ["floor", "ceil"] },
      durationS: 30,
    };
    saveSettings(store, settings);
    expect(loadSettings(store)).toEqual(settings);
  });

  it("loaded settings keep the review mode but never review items", () => {
    const store = memoryStore();
    const item = { mode: "division", seed: 1, params: { kinds: ["floor"] } };
    saveSettings(store, { ...DEFAULT_SETTINGS, mode: "review", review: { items: [item] } });
    expect(loadSettings(store)).toEqual({ ...DEFAULT_SETTINGS, mode: "review" });
    expect(DEFAULT_SETTINGS.review).toEqual({ items: [] });
  });

  it("settings saved by T01 load with defaults for the new fields", () => {
    const arithmetic = { ...DEFAULT_ARITHMETIC, operations: ["add" as const] };
    const store = memoryStore({ [SETTINGS_KEY]: JSON.stringify({ arithmetic, durationS: 60 }) });
    expect(loadSettings(store)).toEqual({ ...DEFAULT_SETTINGS, arithmetic, durationS: 60 });
  });

  it("settings saved by T02 load with the default division kinds", () => {
    const saved = {
      mode: "factoring",
      arithmetic: DEFAULT_ARITHMETIC,
      factoring: { levels: [3] },
      durationS: 30,
    };
    const store = memoryStore({ [SETTINGS_KEY]: JSON.stringify(saved) });
    expect(loadSettings(store)).toEqual({
      ...DEFAULT_SETTINGS,
      ...saved,
      factoring: { levels: [3] },
    });
  });

  it("invalid division kinds fall back to the defaults", () => {
    const saved = { arithmetic: DEFAULT_ARITHMETIC, division: { kinds: ["pow"] }, durationS: 60 };
    expect(loadSettings(memoryStore({ [SETTINGS_KEY]: JSON.stringify(saved) }))).toEqual(
      DEFAULT_SETTINGS,
    );
  });

  it("an unknown mode or invalid levels fall back to the defaults", () => {
    const base = { arithmetic: DEFAULT_ARITHMETIC, durationS: 60 };
    expect(
      loadSettings(memoryStore({ [SETTINGS_KEY]: JSON.stringify({ ...base, mode: "chess" }) })),
    ).toEqual(DEFAULT_SETTINGS);
    expect(
      loadSettings(
        memoryStore({ [SETTINGS_KEY]: JSON.stringify({ ...base, factoring: { levels: [] } }) }),
      ),
    ).toEqual(DEFAULT_SETTINGS);
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
