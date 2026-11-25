import { describe, expect, it } from "vitest";
import { memoryStore } from "./history";
import {
  appendRegexResult,
  DEFAULT_REGEX_SETTINGS,
  loadRegexResults,
  loadRegexSettings,
  MAX_REGEX_RESULTS,
  parseRegexSettings,
  REGEX_KEY,
  REGEX_RESULTS_KEY,
  saveRegexSettings,
  type RegexRoundResult,
} from "./regex";

// T45 AC-7: regex practice settings stored in popis.regex and round results in popis.regex-results.

function sampleResult(seed: number): RegexRoundResult {
  return {
    version: 1,
    dialect: "python",
    seed,
    correct: 4,
    skipped: 1,
    attempts: 6,
    timeMs: 32_000,
    finishedAt: Date.UTC(2026, 10, 25, 3) + seed,
  };
}

describe("regex storage", () => {
  it("uses popis.regex for settings and defaults to Python re with all kinds", () => {
    expect(REGEX_KEY).toBe("popis.regex");
    expect(REGEX_RESULTS_KEY).toBe("popis.regex-results");
    const store = memoryStore();
    expect(loadRegexSettings(store)).toEqual(DEFAULT_REGEX_SETTINGS);
    expect(DEFAULT_REGEX_SETTINGS.dialect).toBe("python");
  });

  it("saves and reloads dialect and kinds in popis.regex", () => {
    const store = memoryStore();
    saveRegexSettings(store, { dialect: "ere", kinds: ["casar", "trocar"] });
    expect(loadRegexSettings(store)).toEqual({ dialect: "ere", kinds: ["casar", "trocar"] });
  });

  it("falls back to defaults on invalid or corrupt settings", () => {
    expect(parseRegexSettings(null)).toEqual(DEFAULT_REGEX_SETTINGS);
    expect(parseRegexSettings({ dialect: "pcre", kinds: ["bogus"] })).toEqual(
      DEFAULT_REGEX_SETTINGS,
    );
    expect(parseRegexSettings({ dialect: "ere", kinds: [] })).toEqual({
      dialect: "ere",
      kinds: DEFAULT_REGEX_SETTINGS.kinds,
    });
  });

  it("appends round results, ignores corrupt entries and caps history at MAX_REGEX_RESULTS", () => {
    const store = memoryStore({ [REGEX_RESULTS_KEY]: JSON.stringify([{ bad: true }, 7]) });
    expect(loadRegexResults(store)).toEqual([]);

    const nonArray = memoryStore({ [REGEX_RESULTS_KEY]: JSON.stringify({ nope: true }) });
    expect(loadRegexResults(nonArray)).toEqual([]);

    for (let i = 0; i < MAX_REGEX_RESULTS + 5; i++) {
      appendRegexResult(store, sampleResult(i));
    }
    const loaded = loadRegexResults(store);
    expect(loaded).toHaveLength(MAX_REGEX_RESULTS);
    expect(loaded[0]?.seed).toBe(5);
    expect(loaded[loaded.length - 1]?.seed).toBe(MAX_REGEX_RESULTS + 4);
  });
});
