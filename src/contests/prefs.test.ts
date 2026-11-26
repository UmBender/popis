import { describe, expect, it } from "vitest";
import { memoryStore } from "../storage/history";
import { SITES } from "./model";
import { CONTESTS_KEY, loadContestsPrefs, saveContestsPrefs } from "./prefs";

describe("contests prefs", () => {
  it("loadContestsPrefs defaults to all four sites when storage is empty or corrupt", () => {
    expect(loadContestsPrefs(memoryStore())).toEqual({ sites: [...SITES] });
    expect(loadContestsPrefs(memoryStore({ [CONTESTS_KEY]: "{bad" }))).toEqual({
      sites: [...SITES],
    });
    expect(
      loadContestsPrefs(memoryStore({ [CONTESTS_KEY]: JSON.stringify({ sites: "nope" }) })),
    ).toEqual({
      sites: [...SITES],
    });
  });

  it("saveContestsPrefs stores the selected sites under popis.contests and ignores unknown entries", () => {
    const store = memoryStore();
    saveContestsPrefs(store, { sites: ["atcoder", "codeforces"] });

    expect(store.getItem(CONTESTS_KEY)).toBe(JSON.stringify({ sites: ["atcoder", "codeforces"] }));
    expect(loadContestsPrefs(store)).toEqual({ sites: ["codeforces", "atcoder"] });

    store.setItem(CONTESTS_KEY, JSON.stringify({ sites: ["leetcode", "unknown", "leetcode"] }));
    expect(loadContestsPrefs(store)).toEqual({ sites: ["leetcode"] });

    saveContestsPrefs(store, { sites: [] });
    expect(loadContestsPrefs(store)).toEqual({ sites: [] });
  });
});
