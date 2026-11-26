import { describe, expect, it } from "vitest";
import { memoryStore } from "./history";
import {
  appendIcpcResult,
  DEFAULT_ICPC_SETTINGS,
  ICPC_KEY,
  ICPC_RESULTS_KEY,
  loadIcpcResults,
  loadIcpcSettings,
  MAX_ICPC_RESULTS,
  parseIcpcSettings,
  saveIcpcSettings,
  type IcpcResult,
} from "./icpc";

// T43 AC-3: persistence of ICPC scoreboard drill settings and round results.

describe("icpc storage (AC-3)", () => {
  it("parses valid settings and falls back to defaults for invalid input", () => {
    expect(parseIcpcSettings(null)).toEqual(DEFAULT_ICPC_SETTINGS);
    expect(
      parseIcpcSettings({ durationS: 999, kind: "invalido", compileErrorCounts: "sim" }),
    ).toEqual(DEFAULT_ICPC_SETTINGS);
    expect(
      parseIcpcSettings({ durationS: 60, kind: "ultrapassar", compileErrorCounts: true }),
    ).toEqual({
      durationS: 60,
      kind: "ultrapassar",
      compileErrorCounts: true,
    });
  });

  it("saves and loads ICPC settings", () => {
    const store = memoryStore();
    expect(loadIcpcSettings(store)).toEqual(DEFAULT_ICPC_SETTINGS);
    expect(DEFAULT_ICPC_SETTINGS.durationS).toBe(90);
    expect(DEFAULT_ICPC_SETTINGS.compileErrorCounts).toBe(false);

    saveIcpcSettings(store, { durationS: 120, kind: "escolher", compileErrorCounts: true });
    expect(loadIcpcSettings(store)).toEqual({
      durationS: 120,
      kind: "escolher",
      compileErrorCounts: true,
    });
    expect(store.getItem(ICPC_KEY)).toBeTruthy();
  });

  it("filters corrupted results and trims to MAX_ICPC_RESULTS", () => {
    const store = memoryStore({
      [ICPC_RESULTS_KEY]: JSON.stringify([
        "bad",
        { version: 2 },
        {
          version: 1,
          durationS: 90,
          kind: "nope",
          compileErrorCounts: false,
          seed: 1,
          correct: 1,
          wrong: 0,
          skipped: 0,
          finishedAt: 1,
        },
        {
          version: 1,
          durationS: 90,
          kind: "all",
          compileErrorCounts: "yes",
          seed: 1,
          correct: 1,
          wrong: 0,
          skipped: 0,
          finishedAt: 1,
        },
      ]),
    });
    expect(loadIcpcResults(store)).toEqual([]);

    const nonArray = memoryStore({ [ICPC_RESULTS_KEY]: JSON.stringify({ nope: true }) });
    expect(loadIcpcResults(nonArray)).toEqual([]);

    const fresh = memoryStore();
    for (let i = 0; i < MAX_ICPC_RESULTS + 5; i += 1) {
      const r: IcpcResult = {
        version: 1,
        durationS: 90,
        kind: "all",
        compileErrorCounts: i % 2 === 0,
        seed: i,
        correct: i,
        wrong: 0,
        skipped: 0,
        finishedAt: 1000 + i,
      };
      appendIcpcResult(fresh, r);
    }
    const saved = loadIcpcResults(fresh);
    expect(saved).toHaveLength(MAX_ICPC_RESULTS);
    expect(saved[0]?.seed).toBe(5);
  });
});
