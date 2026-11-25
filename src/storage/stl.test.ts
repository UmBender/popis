import { describe, expect, it } from "vitest";
import { memoryStore } from "./history";
import {
  appendStlResult,
  DEFAULT_STL_SETTINGS,
  loadStlResults,
  loadStlSettings,
  MAX_STL_RESULTS,
  parseStlSettings,
  saveStlSettings,
  STL_KEY,
  STL_RESULTS_KEY,
  type StlResult,
} from "./stl";

// T42 AC-5: persistence of STL settings and round results.

describe("stl storage", () => {
  it("parses valid settings and falls back to defaults for invalid input", () => {
    expect(parseStlSettings(null)).toEqual(DEFAULT_STL_SETTINGS);
    expect(parseStlSettings({ durationS: 999, level: 99 })).toEqual(DEFAULT_STL_SETTINGS);
    expect(parseStlSettings({ durationS: 60, level: 4 })).toEqual({ durationS: 60, level: 4 });
  });

  it("saves and loads STL settings", () => {
    const store = memoryStore();
    expect(loadStlSettings(store)).toEqual(DEFAULT_STL_SETTINGS);
    saveStlSettings(store, { durationS: 30, level: 3 });
    expect(loadStlSettings(store)).toEqual({ durationS: 30, level: 3 });
    expect(store.getItem(STL_KEY)).toBeTruthy();
  });

  it("filters corrupted results and trims to MAX_STL_RESULTS", () => {
    const store = memoryStore({
      [STL_RESULTS_KEY]: JSON.stringify([
        "bad",
        { version: 2 },
        {
          version: 1,
          level: 9,
          durationS: 120,
          seed: 1,
          correct: 1,
          wrong: 0,
          skipped: 0,
          finishedAt: 1,
        },
      ]),
    });
    expect(loadStlResults(store)).toEqual([]);

    const nonArray = memoryStore({ [STL_RESULTS_KEY]: JSON.stringify({ nope: true }) });
    expect(loadStlResults(nonArray)).toEqual([]);

    const fresh = memoryStore();
    for (let i = 0; i < MAX_STL_RESULTS + 5; i++) {
      const r: StlResult = {
        version: 1,
        durationS: 120,
        level: ((i % 4) + 1) as 1 | 2 | 3 | 4,
        seed: i,
        correct: i,
        wrong: 0,
        skipped: 0,
        finishedAt: 1000 + i,
      };
      appendStlResult(fresh, r);
    }
    const saved = loadStlResults(fresh);
    expect(saved).toHaveLength(MAX_STL_RESULTS);
    expect(saved[0]?.seed).toBe(5);
  });
});
