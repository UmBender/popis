import { describe, expect, it } from "vitest";
import { memoryStore } from "./history";
import { GOALS_KEY, loadGoals, removeGoal, saveGoal } from "./goals";

describe("goals storage", () => {
  it("saveGoal, loadGoals and removeGoal persist goals per config key", () => {
    const store = memoryStore();
    expect(loadGoals(store)).toEqual({});
    saveGoal(store, "arithmetic|120s", {
      target: 55,
      deadline: "2026-12-31",
      setAt: 1_700_000_000_000,
      baseline: 40,
    });
    expect(loadGoals(store)["arithmetic|120s"]).toEqual({
      target: 55,
      deadline: "2026-12-31",
      setAt: 1_700_000_000_000,
      baseline: 40,
    });
    removeGoal(store, "arithmetic|120s");
    expect(loadGoals(store)).toEqual({});
  });

  it("loadGoals ignores corrupt entries safely", () => {
    const store = memoryStore({
      [GOALS_KEY]: JSON.stringify({ bad: { target: "no" }, nil: null }),
    });
    expect(loadGoals(store)).toEqual({});
    expect(loadGoals(memoryStore({ [GOALS_KEY]: JSON.stringify([1, 2, 3]) }))).toEqual({});
  });
});
