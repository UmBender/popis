import { describe, expect, it } from "vitest";
import { REGISTER_KINDS } from "../vim/drills/register-edit";
import { memoryStore, type KeyValueStore } from "./history";
import {
  VIM_LEARN_KEY,
  completeLesson,
  loadCompleted,
  loadUnlocked,
  parseCompleted,
  parseUnlocked,
  saveCompleted,
  saveUnlocked,
  unlockKind,
} from "./vim-learn";

// AC-6 (T16) & AC-4 (T20): the kinds unlocked and lessons completed in Learn are saved,
// migrating T16's unlocked list into v2 without losing progress.

describe("unlocked kinds", () => {
  it("nothing is unlocked in a new store", () => {
    expect(loadUnlocked(memoryStore())).toEqual([]);
  });

  it("unlocking a kind saves it in version 2 format", () => {
    const store = memoryStore();
    unlockKind(store, "number-lines");
    expect(loadUnlocked(store)).toEqual(["number-lines"]);
    expect(JSON.parse(store.getItem(VIM_LEARN_KEY) as string)).toEqual({
      version: 2,
      completed: ["number-lines"],
    });
  });

  it("unlocking the same kind twice keeps one copy", () => {
    const store = memoryStore();
    unlockKind(store, "swap-columns");
    unlockKind(store, "swap-columns");
    expect(loadUnlocked(store)).toEqual(["swap-columns"]);
  });

  it("kinds come back in the order of the list, not of unlocking", () => {
    const store = memoryStore();
    unlockKind(store, "increment-indexes");
    unlockKind(store, "number-lines");
    expect(loadUnlocked(store)).toEqual(["number-lines", "increment-indexes"]);
  });

  it("unknown kinds and bad shapes are dropped", () => {
    expect(parseUnlocked({ unlocked: ["number-lines", "nope", 3] })).toEqual(["number-lines"]);
    expect(parseUnlocked({ unlocked: "number-lines" })).toEqual([]);
    expect(parseUnlocked(null)).toEqual([]);
    expect(parseUnlocked(7)).toEqual([]);
  });

  it("corrupt JSON loads as nothing unlocked", () => {
    expect(loadUnlocked(memoryStore({ [VIM_LEARN_KEY]: "{oops" }))).toEqual([]);
  });

  it("a full store does not break saving", () => {
    const full: KeyValueStore = {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
    };
    expect(() => {
      saveUnlocked(full, [...REGISTER_KINDS]);
    }).not.toThrow();
    expect(() => {
      saveCompleted(full, ["motion-hjkl"]);
    }).not.toThrow();
  });
});

describe("curriculum progress and T16 migration (T20 AC-4)", () => {
  it("migrates T16 unlocked format without losing progress", () => {
    const store = memoryStore({
      [VIM_LEARN_KEY]: JSON.stringify({ unlocked: ["copy-block", "number-lines"] }),
    });
    expect(loadCompleted(store)).toEqual(["copy-block", "number-lines"]);
    expect(loadUnlocked(store)).toEqual(["number-lines", "copy-block"]);
  });

  it("saves and loads completed lesson ids in version 2 format", () => {
    const store = memoryStore();
    completeLesson(store, "motion-hjkl");
    completeLesson(store, "number-lines");
    expect(loadCompleted(store)).toEqual(["motion-hjkl", "number-lines"]);
    expect(loadUnlocked(store)).toEqual(["number-lines"]);
    expect(JSON.parse(store.getItem(VIM_LEARN_KEY) as string)).toEqual({
      version: 2,
      completed: ["motion-hjkl", "number-lines"],
    });
  });

  it("completeLesson migrates existing T16 unlocked data and keeps it", () => {
    const store = memoryStore({
      [VIM_LEARN_KEY]: JSON.stringify({ unlocked: ["swap-columns"] }),
    });
    completeLesson(store, "motion-hjkl");
    expect(loadCompleted(store)).toEqual(["motion-hjkl", "swap-columns"]);
    expect(loadUnlocked(store)).toEqual(["swap-columns"]);
  });

  it("drops unknown lesson ids and corrupt shapes in parseCompleted", () => {
    expect(parseCompleted({ version: 2, completed: ["motion-hjkl", "bogus", 42] })).toEqual([
      "motion-hjkl",
    ]);
    expect(parseCompleted({ version: 2, completed: "motion-hjkl" })).toEqual([]);
    expect(parseCompleted(null)).toEqual([]);
    expect(loadCompleted(memoryStore({ [VIM_LEARN_KEY]: "{bad" }))).toEqual([]);
  });
});
