import { describe, expect, it } from "vitest";
import { COMPILE_GROUPS } from "../compile/causes";
import {
  COMPILE_KEY,
  COMPILE_RESULTS_KEY,
  DEFAULT_COMPILE_SETTINGS,
  MAX_COMPILE_RESULTS,
  appendCompileResult,
  loadCompileResults,
  loadCompileSettings,
  parseCompileSettings,
  saveCompileSettings,
  type CompileRoundResult,
} from "./compile";
import { memoryStore, type KeyValueStore } from "./history";

// T40 AC-4: popis.compile settings and compile-results storage.

function sampleResult(seed: number): CompileRoundResult {
  return {
    version: 1,
    durationS: 90,
    seed,
    correct: 5,
    wrong: 1,
    skipped: 0,
    finishedAt: 1000 + seed,
  };
}

describe("compile storage (AC-4)", () => {
  it("loads, saves and validates popis.compile settings", () => {
    const store = memoryStore();
    expect(loadCompileSettings(store)).toEqual(DEFAULT_COMPILE_SETTINGS);
    expect(DEFAULT_COMPILE_SETTINGS).toEqual({
      durationS: 90,
      groups: COMPILE_GROUPS,
    });

    saveCompileSettings(store, { durationS: 60, groups: ["asan", "ubsan"] });
    expect(store.getItem(COMPILE_KEY)).toBeTruthy();
    expect(loadCompileSettings(store)).toEqual({ durationS: 60, groups: ["asan", "ubsan"] });

    expect(parseCompileSettings(null)).toEqual(DEFAULT_COMPILE_SETTINGS);
    expect(parseCompileSettings({ durationS: 999, groups: ["invalid"] })).toEqual(
      DEFAULT_COMPILE_SETTINGS,
    );
    expect(loadCompileSettings(memoryStore({ [COMPILE_KEY]: "{bad" }))).toEqual(
      DEFAULT_COMPILE_SETTINGS,
    );
  });

  it("stores and trims round results up to MAX_COMPILE_RESULTS and ignores corrupt entries", () => {
    const store = memoryStore();
    expect(loadCompileResults(store)).toEqual([]);

    for (let i = 0; i < MAX_COMPILE_RESULTS + 4; i++) {
      appendCompileResult(store, sampleResult(i));
    }
    const loaded = loadCompileResults(store);
    expect(loaded).toHaveLength(MAX_COMPILE_RESULTS);
    expect(loaded[0]?.seed).toBe(4);
    expect(loaded.at(-1)?.seed).toBe(MAX_COMPILE_RESULTS + 3);

    const mixed = memoryStore({
      [COMPILE_RESULTS_KEY]: JSON.stringify([sampleResult(1), { version: 2 }, null, "bad"]),
    });
    expect(loadCompileResults(mixed)).toEqual([sampleResult(1)]);
    expect(loadCompileResults(memoryStore({ [COMPILE_RESULTS_KEY]: "{" }))).toEqual([]);

    const full: KeyValueStore = {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
    };
    expect(() => {
      saveCompileSettings(full, DEFAULT_COMPILE_SETTINGS);
    }).not.toThrow();
  });
});
