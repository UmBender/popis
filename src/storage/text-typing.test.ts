import { describe, expect, it } from "vitest";
import { DEFAULT_TEXT_SETTINGS, textConfigKey } from "../typing/text";
import { memoryStore } from "./history";
import {
  appendTextResult,
  loadTextResults,
  loadTextSettings,
  MAX_TEXT_RESULTS,
  saveTextSettings,
  TEXT_TYPING_KEY,
  TEXT_TYPING_SETTINGS_KEY,
  textSummary,
  type TextResult,
} from "./text-typing";

const CONFIG = textConfigKey(DEFAULT_TEXT_SETTINGS);
const OTHER = textConfigKey({ ...DEFAULT_TEXT_SETTINGS, language: "en" });

function result(over: Partial<TextResult> = {}): TextResult {
  return {
    version: 1,
    config: CONFIG,
    seed: 1,
    wpm: 50,
    raw: 55,
    accuracy: 0.95,
    chars: { correct: 100, incorrect: 3, extra: 1, missed: 2 },
    timeMs: 30_000,
    finishedAt: 0,
    ...over,
  };
}

describe("text typing results", () => {
  it("text typing results use their own keys", () => {
    expect(TEXT_TYPING_KEY).toBe("popis.text-typing");
    expect(TEXT_TYPING_SETTINGS_KEY).toBe("popis.text-typing-settings");
  });

  it("text typing results start empty and keep what is appended", () => {
    const store = memoryStore();
    expect(loadTextResults(store)).toEqual([]);
    appendTextResult(store, result({ wpm: 40 }));
    appendTextResult(store, result({ wpm: 60, config: OTHER }));
    expect(loadTextResults(store)).toEqual([
      result({ wpm: 40 }),
      result({ wpm: 60, config: OTHER }),
    ]);
  });

  it("text typing results keep only the most recent 200", () => {
    expect(MAX_TEXT_RESULTS).toBe(200);
    const store = memoryStore();
    for (let i = 0; i < 205; i++) appendTextResult(store, result({ seed: i }));
    const loaded = loadTextResults(store);
    expect(loaded).toHaveLength(200);
    expect(loaded[0]?.seed).toBe(5);
  });

  it("text typing results load corrupt data as empty and drop invalid entries", () => {
    expect(loadTextResults(memoryStore({ [TEXT_TYPING_KEY]: "{not json" }))).toEqual([]);
    expect(loadTextResults(memoryStore({ [TEXT_TYPING_KEY]: '{"a":1}' }))).toEqual([]);
    const entries = [
      result(),
      null,
      { ...result(), version: 2 },
      { ...result(), config: 3 },
      { ...result(), wpm: "fast" },
      { ...result(), raw: null },
      { ...result(), chars: null },
      { ...result(), chars: { correct: 1, incorrect: 0, extra: 0 } },
      { ...result(), timeMs: Number.POSITIVE_INFINITY },
    ];
    const store = memoryStore({ [TEXT_TYPING_KEY]: JSON.stringify(entries) });
    expect(loadTextResults(store)).toEqual([result()]);
  });

  it("text typing results survive a store that throws", () => {
    const broken = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("full");
      },
    };
    expect(loadTextResults(broken)).toEqual([]);
    expect(() => {
      appendTextResult(broken, result());
    }).not.toThrow();
  });
});

describe("text typing settings", () => {
  it("text typing settings load the defaults when nothing or garbage is stored", () => {
    expect(loadTextSettings(memoryStore())).toEqual(DEFAULT_TEXT_SETTINGS);
    expect(loadTextSettings(memoryStore({ [TEXT_TYPING_SETTINGS_KEY]: "][" }))).toEqual(
      DEFAULT_TEXT_SETTINGS,
    );
  });

  it("text typing settings round-trip through the store", () => {
    const store = memoryStore();
    const settings = { ...DEFAULT_TEXT_SETTINGS, language: "en" as const, punctuation: true };
    saveTextSettings(store, settings);
    expect(loadTextSettings(store)).toEqual(settings);
  });
});

describe("text summary", () => {
  it("text summary is null without results of the config", () => {
    expect(textSummary([result({ config: OTHER })], CONFIG)).toBeNull();
  });

  it("text summary gives the best and the mean of the last 10 of the config", () => {
    const results = [
      result({ wpm: 100 }),
      ...Array.from({ length: 10 }, (_, i) => result({ wpm: 40 + i })),
      result({ wpm: 500, config: OTHER }),
    ];
    expect(textSummary(results, CONFIG)).toEqual({ best: 100, recentMean: 44.5 });
  });
});
