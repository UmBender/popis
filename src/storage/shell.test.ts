import { describe, expect, it } from "vitest";
import { SHELL_DRILL_KINDS } from "../shell/drill";
import { memoryStore } from "./history";
import {
  appendShellResult,
  DEFAULT_SHELL_SETTINGS,
  loadShellResults,
  loadShellSettings,
  MAX_SHELL_RESULTS,
  parseShellSettings,
  saveShellSettings,
  SHELL_KEY,
  SHELL_RESULTS_KEY,
  type ShellCmdResult,
} from "./shell";

// T39 AC-7: Shell Comandos settings stored in popis.shell and round results capped cleanly.

describe("shell storage (AC-7)", () => {
  it("falls back to defaults on empty or corrupt popis.shell", () => {
    const store = memoryStore();
    expect(loadShellSettings(store)).toEqual(DEFAULT_SHELL_SETTINGS);

    store.setItem(SHELL_KEY, "{not json");
    expect(loadShellSettings(store)).toEqual(DEFAULT_SHELL_SETTINGS);

    expect(parseShellSettings({ durationS: 999, kinds: ["nope"] })).toEqual(DEFAULT_SHELL_SETTINGS);
  });

  it("saves and reloads valid settings in popis.shell", () => {
    const store = memoryStore();
    const custom = { durationS: 120, kinds: ["compilar", "stress"] as const };
    saveShellSettings(store, custom);
    expect(store.getItem(SHELL_KEY)).toBeTruthy();
    expect(loadShellSettings(store)).toEqual(custom);

    // Preserves canonical kind order and ignores unknown kinds.
    expect(parseShellSettings({ durationS: 30, kinds: ["texto", "bad", "arquivos"] })).toEqual({
      durationS: 30,
      kinds: ["arquivos", "texto"],
    });
    expect(DEFAULT_SHELL_SETTINGS.kinds).toEqual(SHELL_DRILL_KINDS);
  });

  it("appends, filters corrupt entries and caps shell round results", () => {
    const store = memoryStore();
    expect(loadShellResults(store)).toEqual([]);

    store.setItem(SHELL_RESULTS_KEY, JSON.stringify([{ bad: true }, null, "x"]));
    expect(loadShellResults(store)).toEqual([]);

    const sample = (i: number): ShellCmdResult => ({
      version: 1,
      durationS: 60,
      seed: i,
      correct: i % 10,
      wrong: 1,
      skipped: 0,
      finishedAt: 1000 + i,
    });

    for (let i = 0; i < MAX_SHELL_RESULTS + 5; i++) {
      appendShellResult(store, sample(i));
    }
    const loaded = loadShellResults(store);
    expect(loaded).toHaveLength(MAX_SHELL_RESULTS);
    expect(loaded[0]?.seed).toBe(5);
    expect(loaded[loaded.length - 1]?.seed).toBe(MAX_SHELL_RESULTS + 4);
  });
});
