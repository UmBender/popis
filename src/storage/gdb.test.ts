import { describe, expect, it } from "vitest";
import { GDB_CMD_KINDS } from "../gdb/cmd-drill";
import { GDB_OUT_KINDS } from "../gdb/out-drill";
import { memoryStore, type KeyValueStore } from "./history";
import {
  DEFAULT_GDB_OUT_SETTINGS,
  DEFAULT_GDB_SETTINGS,
  GDB_KEY,
  GDB_OUT_KEY,
  GDB_OUT_RESULTS_KEY,
  GDB_RESULTS_KEY,
  MAX_GDB_RESULTS,
  appendGdbOutResult,
  appendGdbResult,
  loadGdbOutResults,
  loadGdbOutSettings,
  loadGdbResults,
  loadGdbSettings,
  parseGdbOutSettings,
  parseGdbSettings,
  saveGdbOutSettings,
  saveGdbSettings,
  type GdbCmdResult,
  type GdbOutResult,
} from "./gdb";

// T25 AC-7: GDB Comandos settings stored in popis.gdb and round results stored cleanly.

describe("gdb settings and results storage (AC-7)", () => {
  it("loads default settings on an empty store", () => {
    expect(loadGdbSettings(memoryStore())).toEqual(DEFAULT_GDB_SETTINGS);
    expect(DEFAULT_GDB_SETTINGS.durationS).toBe(60);
    expect(DEFAULT_GDB_SETTINGS.kinds).toEqual(GDB_CMD_KINDS);
  });

  it("saves and reloads valid settings in popis.gdb", () => {
    const store = memoryStore();
    saveGdbSettings(store, { durationS: 120, kinds: ["break-linha", "andar"] });
    expect(store.getItem(GDB_KEY)).toBeTruthy();
    expect(loadGdbSettings(store)).toEqual({
      durationS: 120,
      kinds: ["break-linha", "andar"],
    });
  });

  it("falls back to defaults on invalid fields or corrupt JSON", () => {
    expect(parseGdbSettings(null)).toEqual(DEFAULT_GDB_SETTINGS);
    expect(parseGdbSettings({ durationS: 999, kinds: ["nope"] })).toEqual(DEFAULT_GDB_SETTINGS);
    expect(parseGdbSettings({ durationS: 30, kinds: ["andar", "nope", "iniciar"] })).toEqual({
      durationS: 30,
      kinds: ["iniciar", "andar"],
    });
    expect(loadGdbSettings(memoryStore({ [GDB_KEY]: "{bad" }))).toEqual(DEFAULT_GDB_SETTINGS);
  });

  it("stores and trims round results up to MAX_GDB_RESULTS and ignores corrupt entries", () => {
    const store = memoryStore();
    const sample = (i: number): GdbCmdResult => ({
      version: 1,
      durationS: 60,
      seed: i,
      correct: 8,
      wrong: 2,
      skipped: 1,
      finishedAt: 1000 + i,
    });
    for (let i = 0; i < MAX_GDB_RESULTS + 5; i++) {
      appendGdbResult(store, sample(i));
    }
    const loaded = loadGdbResults(store);
    expect(loaded).toHaveLength(MAX_GDB_RESULTS);
    expect(loaded[0]?.seed).toBe(5);
    expect(loaded.at(-1)?.seed).toBe(MAX_GDB_RESULTS + 4);

    const corrupt = memoryStore({
      [GDB_RESULTS_KEY]: JSON.stringify([sample(1), { bad: true }, null]),
    });
    expect(loadGdbResults(corrupt)).toEqual([sample(1)]);
    expect(loadGdbResults(memoryStore({ [GDB_RESULTS_KEY]: "{" }))).toEqual([]);
  });

  it("tolerates quota errors when saving settings or results", () => {
    const full: KeyValueStore = {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
    };
    expect(() => {
      saveGdbSettings(full, DEFAULT_GDB_SETTINGS);
      appendGdbResult(full, {
        version: 1,
        durationS: 60,
        seed: 1,
        correct: 5,
        wrong: 0,
        skipped: 0,
        finishedAt: 1000,
      });
    }).not.toThrow();
  });

  it("loads, saves and validates GDB Saída settings and results", () => {
    const store = memoryStore();
    expect(loadGdbOutSettings(store)).toEqual(DEFAULT_GDB_OUT_SETTINGS);
    expect(DEFAULT_GDB_OUT_SETTINGS).toEqual({
      durationS: 60,
      level: 1,
      kinds: GDB_OUT_KINDS,
    });

    saveGdbOutSettings(store, { durationS: 120, level: 3, kinds: ["formato", "memoria"] });
    expect(store.getItem(GDB_OUT_KEY)).toBeTruthy();
    expect(loadGdbOutSettings(store)).toEqual({
      durationS: 120,
      level: 3,
      kinds: ["formato", "memoria"],
    });

    expect(parseGdbOutSettings(null)).toEqual(DEFAULT_GDB_OUT_SETTINGS);
    expect(parseGdbOutSettings({ durationS: 99, level: 9, kinds: ["bad"] })).toEqual(
      DEFAULT_GDB_OUT_SETTINGS,
    );
    expect(parseGdbOutSettings({ durationS: 30, level: 2, kinds: ["sizeof", "bad"] })).toEqual({
      durationS: 30,
      level: 2,
      kinds: ["sizeof"],
    });
    expect(loadGdbOutSettings(memoryStore({ [GDB_OUT_KEY]: "{bad" }))).toEqual(
      DEFAULT_GDB_OUT_SETTINGS,
    );

    const sample = (i: number): GdbOutResult => ({
      version: 1,
      durationS: 60,
      level: 2,
      seed: i,
      correct: 6,
      wrong: 1,
      skipped: 0,
      finishedAt: 2000 + i,
    });
    for (let i = 0; i < MAX_GDB_RESULTS + 3; i++) {
      appendGdbOutResult(store, sample(i));
    }
    const loaded = loadGdbOutResults(store);
    expect(loaded).toHaveLength(MAX_GDB_RESULTS);
    expect(loaded[0]?.seed).toBe(3);

    const corrupt = memoryStore({
      [GDB_OUT_RESULTS_KEY]: JSON.stringify([sample(1), { version: 1, level: 9 }, null]),
    });
    expect(loadGdbOutResults(corrupt)).toEqual([sample(1)]);
    expect(loadGdbOutResults(memoryStore({ [GDB_OUT_RESULTS_KEY]: "{" }))).toEqual([]);
  });
});
