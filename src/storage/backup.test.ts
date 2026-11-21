import { describe, expect, it } from "vitest";
import { arithmetic, DEFAULT_ARITHMETIC } from "../gen/arithmetic";
import type { TrainingEvent } from "../stats/event";
import { DAY_MS } from "../stats/summary";
import { backupFileName, exportData, importData } from "./backup";
import { loadDaily } from "./daily";
import { loadEvents, recordEvents } from "./events";
import {
  appendSession,
  DEFAULT_SETTINGS,
  loadHistory,
  loadSettings,
  memoryStore,
  saveSettings,
  type KeyValueStore,
  type SessionRecord,
} from "./history";
import { MIGRATED_KEY } from "./migrate";
import {
  appendTextResult,
  loadTextResults,
  loadTextSettings,
  saveTextSettings,
} from "./text-typing";
import {
  appendTypingResult,
  loadTypingLanguages,
  loadTypingResults,
  saveTypingLanguages,
} from "./typing";
import { loadUnlocked, unlockKind } from "./vim-learn";
import {
  appendVimEditResult,
  appendVimResult,
  loadVimEditResults,
  loadVimEditSettings,
  loadVimResults,
  loadVimSettings,
  saveVimEditSettings,
  saveVimSettings,
} from "./vim";

const NOW = Date.UTC(2026, 10, 20, 15);

function session(finishedAt: number): SessionRecord {
  return {
    version: 1,
    mode: "arithmetic",
    finishedAt,
    durationMs: 120_000,
    seed: finishedAt,
    params: DEFAULT_ARITHMETIC,
    log: [
      {
        problem: arithmetic.generate(finishedAt, DEFAULT_ARITHMETIC),
        outcome: "correct",
        timeMs: 1500,
        corrections: 0,
      },
    ],
  };
}

function event(at: number, i = 0): TrainingEvent {
  return {
    at,
    drill: "vim.edit",
    config: "edit",
    kc: "dd",
    ok: true,
    timeMs: 900,
    extra: { seed: 1, i },
  };
}

const typingResult = (finishedAt: number) => ({
  version: 1 as const,
  snippetId: "cpp-1",
  language: "cpp" as const,
  seed: finishedAt,
  wpm: 40,
  accuracy: 0.9,
  errors: 2,
  timeMs: 30_000,
  finishedAt,
});

const textResult = (finishedAt: number) => ({
  version: 1 as const,
  config: "pt-30",
  seed: finishedAt,
  wpm: 50,
  raw: 55,
  accuracy: 0.9,
  chars: { correct: 90, incorrect: 5, extra: 0, missed: 1 },
  timeMs: 30_000,
  finishedAt,
});

const motionResult = (finishedAt: number) => ({
  version: 1 as const,
  level: 3 as const,
  durationS: 60,
  seed: finishedAt,
  reached: 9,
  skipped: 1,
  efficiency: 0.7,
  finishedAt,
});

const editResult = (finishedAt: number) => ({
  version: 1 as const,
  kind: "edit" as const,
  durationS: 60,
  seed: finishedAt,
  reached: 4,
  skipped: 0,
  efficiency: 1,
  finishedAt,
});

function populated(): KeyValueStore {
  const store = memoryStore();
  saveSettings(store, { ...DEFAULT_SETTINGS, durationS: 60 });
  appendSession(store, session(NOW - 2 * DAY_MS));
  appendSession(store, session(NOW - DAY_MS));
  recordEvents(store, [event(NOW - 400 * DAY_MS), event(NOW - 1000, 0), event(NOW - 1000, 1)], NOW);
  appendTypingResult(store, typingResult(NOW - 5000));
  appendTextResult(store, textResult(NOW - 4000));
  appendVimResult(store, motionResult(NOW - 3000));
  appendVimEditResult(store, editResult(NOW - 2000));
  saveVimSettings(store, { level: 4, durationS: 120 });
  saveVimEditSettings(store, { drill: "edit", durationS: 30, kinds: ["delete-word"] });
  saveTypingLanguages(store, ["python"]);
  saveTextSettings(store, { ...loadTextSettings(store), lenientAccents: true });
  unlockKind(store, "paste-saved-text");
  return store;
}

function snapshot(store: KeyValueStore) {
  return {
    history: loadHistory(store),
    settings: loadSettings(store),
    events: loadEvents(store),
    daily: loadDaily(store),
    typing: loadTypingResults(store),
    text: loadTextResults(store),
    motion: loadVimResults(store),
    edit: loadVimEditResults(store),
    vim: loadVimSettings(store),
    vimEdit: loadVimEditSettings(store),
    languages: loadTypingLanguages(store),
    textSettings: loadTextSettings(store),
    unlocked: loadUnlocked(store),
  };
}

describe("backupFileName", () => {
  it("export names the file by date", () => {
    expect(backupFileName(Date.UTC(2026, 10, 20, 23, 59))).toBe("popis-2026-11-20.json");
  });
});

describe("export and import", () => {
  it("export then clear then import gives the same data", () => {
    const original = populated();
    const text = exportData(original, NOW);

    const fresh = memoryStore();
    const result = importData(fresh, text, NOW);

    expect(result.ok).toBe(true);
    expect(snapshot(fresh)).toEqual(snapshot(original));
    expect(snapshot(fresh).history).toHaveLength(2);
    expect(snapshot(fresh).daily).toHaveLength(1);
  });

  it("export describes the app, version and time", () => {
    const parsed = JSON.parse(exportData(populated(), NOW)) as Record<string, unknown>;

    expect(parsed["app"]).toBe("popis");
    expect(parsed["version"]).toBe(1);
    expect(parsed["exportedAt"]).toBe(NOW);
  });

  it("export leaves out keys that are not stored", () => {
    const parsed = JSON.parse(exportData(memoryStore(), NOW)) as { data: object };

    expect(parsed.data).toEqual({});
  });

  it("export skips corrupt values", () => {
    const parsed = JSON.parse(
      exportData(memoryStore({ "popis.vim": "{", "popis.typing": "[]" }), NOW),
    ) as { data: Record<string, unknown> };

    expect(parsed.data).toEqual({ "popis.typing": [] });
  });

  it("importing marks the migration as done so old rounds are not counted twice", () => {
    const fresh = memoryStore();

    importData(fresh, exportData(populated(), NOW), NOW);

    expect(fresh.getItem(MIGRATED_KEY)).not.toBeNull();
  });

  it("importing twice does not duplicate", () => {
    const original = populated();
    const text = exportData(original, NOW);
    const fresh = memoryStore();

    importData(fresh, text, NOW);
    const second = importData(fresh, text, NOW);

    expect(snapshot(fresh)).toEqual(snapshot(original));
    expect(second).toEqual({ ok: true, added: 0 });
  });

  it("import merges with existing data", () => {
    const text = exportData(populated(), NOW);
    const target = memoryStore();
    appendSession(target, session(NOW - 3 * DAY_MS));
    recordEvents(target, [event(NOW - 2000, 7)], NOW);
    appendTypingResult(target, typingResult(NOW - 9000));
    appendVimResult(target, motionResult(NOW - 8000));

    const result = importData(target, text, NOW);

    expect(result.ok).toBe(true);
    expect(result.ok && result.added).toBeGreaterThan(0);
    expect(loadHistory(target).map((s) => s.finishedAt)).toEqual([
      NOW - 3 * DAY_MS,
      NOW - 2 * DAY_MS,
      NOW - DAY_MS,
    ]);
    expect(loadEvents(target).map((e) => e.extra["i"])).toEqual([7, 0, 1]);
    expect(loadTypingResults(target)).toHaveLength(2);
    expect(loadVimResults(target)).toHaveLength(2);
    expect(loadDaily(target)).toHaveLength(1);
  });

  it("import keeps existing settings", () => {
    const text = exportData(populated(), NOW);
    const target = memoryStore();
    saveSettings(target, { ...DEFAULT_SETTINGS, durationS: 300 });
    saveVimSettings(target, { level: 1, durationS: 30 });

    importData(target, text, NOW);

    expect(loadSettings(target).durationS).toBe(300);
    expect(loadVimSettings(target)).toEqual({ level: 1, durationS: 30 });
    // Not stored here yet, so it comes from the file.
    expect(loadVimEditSettings(target).drill).toBe("edit");
  });

  it("import joins the unlocked lessons", () => {
    const text = exportData(populated(), NOW);
    const target = memoryStore();
    unlockKind(target, "copy-block");

    importData(target, text, NOW);

    expect(loadUnlocked(target)).toEqual(["copy-block", "paste-saved-text"]);
  });

  it("import keeps the larger daily row of the same key", () => {
    const text = exportData(populated(), NOW);
    const target = memoryStore();
    recordEvents(target, [event(NOW - 400 * DAY_MS, 0), event(NOW - 400 * DAY_MS, 1)], NOW);

    importData(target, text, NOW);

    expect(loadDaily(target)).toHaveLength(1);
    expect(loadDaily(target)[0]?.n).toBe(2);
  });

  it("import rejects another app or version", () => {
    const target = memoryStore();

    expect(importData(target, "{", NOW)).toEqual({ ok: false, error: "invalid" });
    expect(importData(target, "[]", NOW)).toEqual({ ok: false, error: "invalid" });
    expect(importData(target, '{"app":"other","version":1,"data":{}}', NOW)).toEqual({
      ok: false,
      error: "app",
    });
    expect(importData(target, '{"app":"popis","version":2,"data":{}}', NOW)).toEqual({
      ok: false,
      error: "version",
    });
    expect(importData(target, '{"app":"popis","version":1}', NOW)).toEqual({
      ok: false,
      error: "invalid",
    });
    expect(loadHistory(target)).toEqual([]);
    expect(target.getItem(MIGRATED_KEY)).toBeNull();
  });

  it("import drops duplicates inside the file", () => {
    const session1 = JSON.parse(exportData(populated(), NOW)) as {
      data: Record<string, unknown[]>;
    };
    const data = session1.data;
    const text = JSON.stringify({
      app: "popis",
      version: 1,
      data: {
        "popis.history.v1": [
          ...(data["popis.history.v1"] ?? []),
          ...(data["popis.history.v1"] ?? []),
        ],
        "popis.events.v1": [...(data["popis.events.v1"] ?? []), ...(data["popis.events.v1"] ?? [])],
        "popis.typing": [...(data["popis.typing"] ?? []), ...(data["popis.typing"] ?? [])],
      },
    });
    const target = memoryStore();

    importData(target, text, NOW);

    expect(loadHistory(target)).toHaveLength(2);
    expect(loadEvents(target)).toHaveLength(2);
    expect(loadTypingResults(target)).toHaveLength(1);
  });

  it("import ignores values of the wrong type", () => {
    const text = JSON.stringify({
      app: "popis",
      version: 1,
      data: { "popis.history.v1": "no", "popis.events.v1": {}, "popis.daily.v1": "no" },
    });
    const target = memoryStore();

    expect(importData(target, text, NOW)).toEqual({ ok: true, added: 0 });
    expect(importData(target, "null", NOW)).toEqual({ ok: false, error: "invalid" });
    expect(importData(target, '{"app":"popis","version":1,"data":[]}', NOW)).toEqual({
      ok: false,
      error: "invalid",
    });
  });

  it("import ignores malformed entries inside a valid file", () => {
    const text = JSON.stringify({
      app: "popis",
      version: 1,
      exportedAt: 1,
      data: {
        "popis.history.v1": [{ nope: true }, 5],
        "popis.events.v1": "text",
        "popis.daily.v1": [1],
        "popis.typing": { not: "a list" },
        "popis.vim-learn": 3,
        "popis.unknown": [1],
      },
    });
    const target = memoryStore();

    expect(importData(target, text, NOW)).toEqual({ ok: true, added: 0 });
    expect(loadHistory(target)).toEqual([]);
  });
});
