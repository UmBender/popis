import { describe, expect, it } from "vitest";
import { memoryStore, type KeyValueStore } from "./history";
import {
  appendVimEditResult,
  appendVimResult,
  assistedRoundCount,
  defaultPreviewMode,
  DEFAULT_VIM_SETTINGS,
  loadVimResults,
  loadVimSettings,
  MAX_VIM_RESULTS,
  parseVimSettings,
  saveVimSettings,
  VIM_KEY,
  VIM_SETTINGS_KEY,
  vimSummary,
  type VimResult,
} from "./vim";

// AC-9: options in popis.vim-settings, results in popis.vim (up to 200),
// summary of the current level and duration, corrupt data loads as defaults.

function result(over: Partial<VimResult> = {}): VimResult {
  return {
    version: 1,
    level: 4,
    durationS: 60,
    seed: 1,
    reached: 10,
    skipped: 1,
    efficiency: 0.8,
    finishedAt: 0,
    ...over,
  };
}

describe("vim storage", () => {
  it("vim storage uses its own keys", () => {
    expect(VIM_KEY).toBe("popis.vim");
    expect(VIM_SETTINGS_KEY).toBe("popis.vim-settings");
  });

  it("settings default to level 1 and 60 seconds", () => {
    expect(DEFAULT_VIM_SETTINGS).toEqual({ level: 1, durationS: 60 });
    expect(loadVimSettings(memoryStore())).toEqual(DEFAULT_VIM_SETTINGS);
  });

  it("settings round-trip", () => {
    const store = memoryStore();
    saveVimSettings(store, { level: 5, durationS: 120 });
    expect(loadVimSettings(store)).toEqual({ level: 5, durationS: 120 });
    expect(store.getItem(VIM_SETTINGS_KEY)).toBe(JSON.stringify({ level: 5, durationS: 120 }));
  });

  it("corrupt settings load as the defaults", () => {
    expect(loadVimSettings(memoryStore({ [VIM_SETTINGS_KEY]: "{not json" }))).toEqual(
      DEFAULT_VIM_SETTINGS,
    );
    expect(parseVimSettings(null)).toEqual(DEFAULT_VIM_SETTINGS);
    expect(parseVimSettings("x")).toEqual(DEFAULT_VIM_SETTINGS);
    expect(parseVimSettings([])).toEqual(DEFAULT_VIM_SETTINGS);
  });

  it("an invalid field falls back to its default and the valid one stays", () => {
    expect(parseVimSettings({ level: 9, durationS: 120 })).toEqual({ level: 1, durationS: 120 });
    expect(parseVimSettings({ level: 3, durationS: 45 })).toEqual({ level: 3, durationS: 60 });
    expect(parseVimSettings({ level: 2.5, durationS: "30" })).toEqual(DEFAULT_VIM_SETTINGS);
    expect(parseVimSettings({ level: 7, durationS: 30 })).toEqual({ level: 7, durationS: 30 });
  });

  it("results start empty and keep what is appended", () => {
    const store = memoryStore();
    expect(loadVimResults(store)).toEqual([]);
    appendVimResult(store, result({ seed: 1 }));
    appendVimResult(store, result({ seed: 2 }));
    expect(loadVimResults(store).map((r) => r.seed)).toEqual([1, 2]);
  });

  it("results keep only the last 200", () => {
    const store = memoryStore();
    for (let i = 0; i < MAX_VIM_RESULTS + 5; i++) appendVimResult(store, result({ seed: i }));
    const loaded = loadVimResults(store);
    expect(loaded).toHaveLength(MAX_VIM_RESULTS);
    expect(loaded[0]?.seed).toBe(5);
    expect(loaded.at(-1)?.seed).toBe(MAX_VIM_RESULTS + 4);
  });

  it("corrupt results load as an empty list and bad entries are dropped", () => {
    expect(loadVimResults(memoryStore({ [VIM_KEY]: "nope" }))).toEqual([]);
    expect(loadVimResults(memoryStore({ [VIM_KEY]: '{"a":1}' }))).toEqual([]);
    const mixed = [result({ seed: 1 }), { version: 2 }, null, { ...result(), level: 9 }, "x"];
    const loaded = loadVimResults(memoryStore({ [VIM_KEY]: JSON.stringify(mixed) }));
    expect(loaded.map((r) => r.seed)).toEqual([1]);
  });

  it("a store that throws does not break reading or writing", () => {
    const broken: KeyValueStore = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("full");
      },
    };
    expect(loadVimResults(broken)).toEqual([]);
    expect(loadVimSettings(broken)).toEqual(DEFAULT_VIM_SETTINGS);
    expect(() => {
      appendVimResult(broken, result());
      saveVimSettings(broken, DEFAULT_VIM_SETTINGS);
    }).not.toThrow();
  });
});

describe("vimSummary", () => {
  it("vimSummary is null without results for the level and duration", () => {
    expect(vimSummary([], 4, 60)).toBeNull();
    expect(vimSummary([result({ level: 3 }), result({ durationS: 30 })], 4, 60)).toBeNull();
  });

  it("vimSummary gives the best count and the mean of the last 10", () => {
    const results = [
      ...Array.from({ length: 3 }, () => result({ reached: 40 })),
      ...Array.from({ length: 10 }, (_, i) => result({ reached: i })),
    ];
    const summary = vimSummary(results, 4, 60);
    expect(summary?.best).toBe(40);
    expect(summary?.recentMean).toBeCloseTo(4.5);
  });

  it("vimSummary ignores other levels and durations", () => {
    const results = [
      result({ reached: 5 }),
      result({ reached: 99, level: 2 }),
      result({ reached: 77, durationS: 120 }),
    ];
    expect(vimSummary(results, 4, 60)).toEqual({ best: 5, recentMean: 5 });
  });

  it("preview option round-trips and validates (T21 AC-1)", () => {
    const store = memoryStore();
    saveVimSettings(store, { level: 3, durationS: 60, preview: "stuck" });
    expect(loadVimSettings(store)).toEqual({ level: 3, durationS: 60, preview: "stuck" });
    expect(parseVimSettings({ level: 3, durationS: 60, preview: "invalid" })).toEqual({
      level: 3,
      durationS: 60,
    });
    expect(parseVimSettings({ level: 3, durationS: 60, preview: "auto" }).preview).toBe("auto");
  });

  it("defaultPreviewMode is auto without vim results and off with results (T21 AC-1)", () => {
    const store = memoryStore();
    expect(defaultPreviewMode(store)).toBe("auto");
    appendVimResult(store, result());
    expect(defaultPreviewMode(store)).toBe("off");

    const editStore = memoryStore();
    appendVimEditResult(editStore, {
      version: 1,
      kind: "edit",
      durationS: 60,
      seed: 1,
      reached: 5,
      skipped: 0,
      efficiency: 1,
      finishedAt: 1,
    });
    expect(defaultPreviewMode(editStore)).toBe("off");
  });

  it("legacy results without assisted load as unassisted and assisted rounds are excluded from summary (T21 AC-4)", () => {
    const legacy = {
      version: 1,
      level: 4,
      durationS: 60,
      seed: 1,
      reached: 12,
      skipped: 0,
      efficiency: 0.9,
      finishedAt: 10,
    };
    const store = memoryStore({ [VIM_KEY]: JSON.stringify([legacy]) });
    const loaded = loadVimResults(store);
    expect(loaded[0]?.assisted).toBe(false);

    appendVimResult(store, result({ seed: 2, reached: 50, assisted: true }));
    appendVimResult(store, result({ seed: 3, reached: 8, assisted: false }));
    const all = loadVimResults(store);
    expect(vimSummary(all, 4, 60)).toEqual({ best: 12, recentMean: 10 });
    expect(assistedRoundCount(all, 4, 60)).toBe(1);
  });
});
