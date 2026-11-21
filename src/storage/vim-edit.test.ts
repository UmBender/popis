import { describe, expect, it } from "vitest";
import { EDIT_KINDS } from "../vim/drills/edit";
import { memoryStore } from "./history";
import {
  appendVimEditResult,
  appendVimResult,
  assistedEditRoundCount,
  DEFAULT_VIM_EDIT_SETTINGS,
  loadVimEditResults,
  loadVimEditSettings,
  loadVimResults,
  MAX_VIM_RESULTS,
  parseVimEditSettings,
  saveVimEditSettings,
  VIM_EDIT_SETTINGS_KEY,
  VIM_KEY,
  vimEditSummary,
  type VimEditResult,
  type VimResult,
} from "./vim";

// AC-9: edit results live in popis.vim with kind "edit", T13 results without a
// kind load as "motion", the summary is kept apart per drill.

function edit(over: Partial<VimEditResult> = {}): VimEditResult {
  return {
    version: 1,
    kind: "edit",
    durationS: 60,
    seed: 1,
    reached: 10,
    skipped: 0,
    efficiency: 0.9,
    finishedAt: 0,
    ...over,
  };
}

function motion(over: Partial<VimResult> = {}): VimResult {
  return {
    version: 1,
    level: 2,
    durationS: 60,
    seed: 1,
    reached: 7,
    skipped: 0,
    efficiency: 0.8,
    finishedAt: 0,
    ...over,
  };
}

describe("edit settings", () => {
  it("the options have their own key and default to the motion drill with every kind", () => {
    expect(VIM_EDIT_SETTINGS_KEY).toBe("popis.vim-edit-settings");
    expect(DEFAULT_VIM_EDIT_SETTINGS).toEqual({
      drill: "motion",
      durationS: 60,
      kinds: EDIT_KINDS,
    });
    expect(loadVimEditSettings(memoryStore())).toEqual(DEFAULT_VIM_EDIT_SETTINGS);
  });

  it("settings round-trip", () => {
    const store = memoryStore();
    const settings = {
      drill: "edit",
      durationS: 120,
      kinds: ["delete-line", "swap-lines"],
    } as const;
    saveVimEditSettings(store, settings);
    expect(loadVimEditSettings(store)).toEqual(settings);
  });

  it("invalid fields fall back to their defaults and unknown kinds are dropped", () => {
    expect(parseVimEditSettings(null)).toEqual(DEFAULT_VIM_EDIT_SETTINGS);
    expect(parseVimEditSettings({ drill: "x", durationS: 45, kinds: "all" })).toEqual(
      DEFAULT_VIM_EDIT_SETTINGS,
    );
    expect(parseVimEditSettings({ kinds: ["swap-lines", "nope"] }).kinds).toEqual(["swap-lines"]);
    expect(parseVimEditSettings({ kinds: [] }).kinds).toEqual(EDIT_KINDS);
    expect(parseVimEditSettings({ kinds: ["nope"] }).kinds).toEqual(EDIT_KINDS);
    expect(parseVimEditSettings({ drill: "edit", durationS: 30 })).toMatchObject({
      drill: "edit",
      durationS: 30,
    });
  });

  it("corrupt stored settings load as the defaults", () => {
    const store = memoryStore({ [VIM_EDIT_SETTINGS_KEY]: "{oops" });
    expect(loadVimEditSettings(store)).toEqual(DEFAULT_VIM_EDIT_SETTINGS);
  });
});

describe("edit results", () => {
  it("are stored with kind edit in popis.vim", () => {
    const store = memoryStore();
    appendVimEditResult(store, edit({ seed: 4 }));
    const raw = JSON.parse(store.getItem(VIM_KEY) ?? "[]") as { kind: string; seed: number }[];
    expect(raw).toEqual([expect.objectContaining({ kind: "edit", seed: 4 })]);
    expect(loadVimEditResults(store).map((r) => r.seed)).toEqual([4]);
  });

  it("do not mix with motion results, and neither erases the other", () => {
    const store = memoryStore();
    appendVimResult(store, motion({ seed: 1 }));
    appendVimEditResult(store, edit({ seed: 2 }));
    appendVimResult(store, motion({ seed: 3 }));
    expect(loadVimResults(store).map((r) => r.seed)).toEqual([1, 3]);
    expect(loadVimEditResults(store).map((r) => r.seed)).toEqual([2]);
  });

  it("T13 results without a kind load as motion", () => {
    const old = { ...motion({ seed: 9 }) };
    const store = memoryStore({ [VIM_KEY]: JSON.stringify([old]) });
    expect(loadVimResults(store)[0]).toMatchObject({ kind: "motion", seed: 9, level: 2 });
  });

  it("keep only the last 200 of all results", () => {
    const store = memoryStore();
    for (let i = 0; i < MAX_VIM_RESULTS + 3; i++) appendVimEditResult(store, edit({ seed: i }));
    const loaded = loadVimEditResults(store);
    expect(loaded).toHaveLength(MAX_VIM_RESULTS);
    expect(loaded[0]?.seed).toBe(3);
  });

  it("bad entries are dropped", () => {
    const mixed = [edit({ seed: 1 }), { ...edit(), version: 2 }, { ...edit(), reached: "x" }, null];
    const store = memoryStore({ [VIM_KEY]: JSON.stringify(mixed) });
    expect(loadVimEditResults(store).map((r) => r.seed)).toEqual([1]);
  });
});

describe("vimEditSummary", () => {
  it("is null without edit results of the duration", () => {
    expect(vimEditSummary([], 60)).toBeNull();
    expect(vimEditSummary([edit({ durationS: 30 })], 60)).toBeNull();
  });

  it("gives the best count and the mean of the last 10", () => {
    const results = [
      ...Array.from({ length: 3 }, () => edit({ reached: 40 })),
      ...Array.from({ length: 10 }, (_, i) => edit({ reached: i })),
    ];
    const summary = vimEditSummary(results, 60);
    expect(summary?.best).toBe(40);
    expect(summary?.recentMean).toBeCloseTo(4.5);
  });

  it("edit settings preview option round-trips and validates (T21 AC-1)", () => {
    const store = memoryStore();
    saveVimEditSettings(store, {
      drill: "edit",
      durationS: 60,
      kinds: ["delete-line"],
      preview: "always",
    });
    expect(loadVimEditSettings(store).preview).toBe("always");
    expect(parseVimEditSettings({ drill: "edit", preview: "bogus" }).preview).toBeUndefined();
  });

  it("legacy edit results without assisted load as unassisted and assisted rounds are excluded (T21 AC-4)", () => {
    const legacy = {
      version: 1,
      kind: "edit",
      durationS: 60,
      seed: 1,
      reached: 6,
      skipped: 0,
      efficiency: 1,
      finishedAt: 1,
    };
    const store = memoryStore({ [VIM_KEY]: JSON.stringify([legacy]) });
    expect(loadVimEditResults(store)[0]?.assisted).toBe(false);
    appendVimEditResult(store, edit({ seed: 2, reached: 99, assisted: true }));
    appendVimEditResult(store, edit({ seed: 3, reached: 10, assisted: false }));
    const all = loadVimEditResults(store);
    expect(vimEditSummary(all, 60)).toEqual({ best: 10, recentMean: 8 });
    expect(assistedEditRoundCount(all, 60)).toBe(1);
  });
});
