import { describe, expect, it } from "vitest";
import { REGISTER_KINDS } from "../vim/drills/register-edit";
import { memoryStore, type KeyValueStore } from "./history";
import { VIM_LEARN_KEY, loadUnlocked, parseUnlocked, saveUnlocked, unlockKind } from "./vim-learn";

// AC-6: the kinds unlocked in the Learn mode are saved.

describe("unlocked kinds", () => {
  it("nothing is unlocked in a new store", () => {
    expect(loadUnlocked(memoryStore())).toEqual([]);
  });

  it("unlocking a kind saves it", () => {
    const store = memoryStore();
    unlockKind(store, "number-lines");
    expect(loadUnlocked(store)).toEqual(["number-lines"]);
    expect(JSON.parse(store.getItem(VIM_LEARN_KEY) as string)).toEqual({
      unlocked: ["number-lines"],
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
  });
});
