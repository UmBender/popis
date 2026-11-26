import { describe, expect, it } from "vitest";
import { WA_CLASSES } from "../wa/classes";
import { memoryStore, type KeyValueStore } from "./history";
import {
  DEFAULT_WA_SETTINGS,
  MAX_WA_RESULTS,
  WA_KEY,
  WA_RESULTS_KEY,
  appendWaResult,
  loadWaResults,
  loadWaSettings,
  parseWaSettings,
  saveWaSettings,
  type WaRoundResult,
} from "./wa";

// T41 AC-4: popis.wa settings and wa-results storage.

function sampleResult(seed: number): WaRoundResult {
  return {
    version: 1,
    seed,
    count: 5,
    correct: 4,
    wrong: 1,
    skipped: 0,
    elapsedMs: 42_000,
    finishedAt: 1000 + seed,
  };
}

describe("wa storage (AC-4)", () => {
  it("loads, saves and validates popis.wa settings", () => {
    const store = memoryStore();
    expect(loadWaSettings(store)).toEqual(DEFAULT_WA_SETTINGS);
    expect(DEFAULT_WA_SETTINGS).toEqual({ classes: WA_CLASSES });

    saveWaSettings(store, { classes: ["overflow", "stl"] });
    expect(store.getItem(WA_KEY)).toBeTruthy();
    expect(loadWaSettings(store)).toEqual({ classes: ["overflow", "stl"] });

    expect(parseWaSettings(null)).toEqual(DEFAULT_WA_SETTINGS);
    expect(parseWaSettings({ classes: ["invalid"] })).toEqual(DEFAULT_WA_SETTINGS);
    expect(loadWaSettings(memoryStore({ [WA_KEY]: "{bad" }))).toEqual(DEFAULT_WA_SETTINGS);
  });

  it("stores and trims round results up to MAX_WA_RESULTS and ignores corrupt entries", () => {
    const store = memoryStore();
    expect(loadWaResults(store)).toEqual([]);

    for (let i = 0; i < MAX_WA_RESULTS + 4; i++) {
      appendWaResult(store, sampleResult(i));
    }
    const loaded = loadWaResults(store);
    expect(loaded).toHaveLength(MAX_WA_RESULTS);
    expect(loaded[0]?.seed).toBe(4);
    expect(loaded.at(-1)?.seed).toBe(MAX_WA_RESULTS + 3);

    const mixed = memoryStore({
      [WA_RESULTS_KEY]: JSON.stringify([sampleResult(1), { version: 2 }, null, "bad"]),
    });
    expect(loadWaResults(mixed)).toEqual([sampleResult(1)]);
    expect(loadWaResults(memoryStore({ [WA_RESULTS_KEY]: "{" }))).toEqual([]);

    const full: KeyValueStore = {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
    };
    expect(() => {
      saveWaSettings(full, DEFAULT_WA_SETTINGS);
    }).not.toThrow();
  });
});
