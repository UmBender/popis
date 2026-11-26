import { describe, expect, it } from "vitest";
import { GUIDE_ITEMS } from "../guide/content";
import {
  EMPTY_GUIDE_STATE,
  GUIDE_KEY,
  loadGuideState,
  parseGuideState,
  resetGuideState,
  saveGuideState,
  toggleGuideItem,
} from "./guide";
import { memoryStore, type KeyValueStore } from "./history";

// T44 AC-2: popis.guide checklist persistence and reset.

describe("guide storage (AC-2)", () => {
  it("guide storage loads, saves, toggles and resets popis.guide", () => {
    const store = memoryStore();
    const first = GUIDE_ITEMS[0]?.id ?? "";
    const second = GUIDE_ITEMS[1]?.id ?? "";
    expect(first).not.toBe("");
    expect(second).not.toBe("");

    expect(loadGuideState(store)).toEqual(EMPTY_GUIDE_STATE);
    expect(EMPTY_GUIDE_STATE).toEqual({ checked: [] });

    const withSecond = toggleGuideItem(EMPTY_GUIDE_STATE, second);
    expect(withSecond).toEqual({ checked: [second] });

    const withBoth = toggleGuideItem(withSecond, first);
    expect(withBoth).toEqual({ checked: [first, second] });

    const unchanged = toggleGuideItem(withBoth, "unknown-id");
    expect(unchanged).toEqual(withBoth);

    saveGuideState(store, withBoth);
    expect(store.getItem(GUIDE_KEY)).toBeTruthy();
    expect(loadGuideState(store)).toEqual({ checked: [first, second] });

    const withoutFirst = toggleGuideItem(withBoth, first);
    expect(withoutFirst).toEqual({ checked: [second] });

    expect(resetGuideState(store)).toEqual(EMPTY_GUIDE_STATE);
    expect(loadGuideState(store)).toEqual(EMPTY_GUIDE_STATE);

    expect(parseGuideState(null)).toEqual(EMPTY_GUIDE_STATE);
    expect(parseGuideState("bad")).toEqual(EMPTY_GUIDE_STATE);
    expect(parseGuideState({ checked: "not-an-array" })).toEqual(EMPTY_GUIDE_STATE);
    expect(parseGuideState({ checked: [second, "ghost", 123, first, second] })).toEqual({
      checked: [first, second],
    });
    expect(loadGuideState(memoryStore({ [GUIDE_KEY]: "{bad" }))).toEqual(EMPTY_GUIDE_STATE);

    const full: KeyValueStore = {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
    };
    expect(() => {
      saveGuideState(full, withBoth);
      resetGuideState(full);
    }).not.toThrow();
  });
});
