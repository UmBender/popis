import { describe, expect, it } from "vitest";
import { unitStatus } from "../learn/curriculum";
import { SHELL_LESSONS, SHELL_UNITS } from "../shell/curriculum";
import { memoryStore } from "./history";
import {
  completeShellLesson,
  loadShellCompleted,
  parseShellCompleted,
  saveShellCompleted,
  SHELL_LEARN_KEY,
} from "./shell-learn";

// T39 AC-7: Shell Learn progress in popis.shell-learn using v2 format (`{ version: 2, completed }`).

describe("shell-learn storage (AC-7)", () => {
  it("loads empty list on missing or corrupt popis.shell-learn", () => {
    const store = memoryStore();
    expect(loadShellCompleted(store)).toEqual([]);

    store.setItem(SHELL_LEARN_KEY, "bad json");
    expect(loadShellCompleted(store)).toEqual([]);

    expect(parseShellCompleted({ version: 2, completed: [123, "unknown-lesson"] })).toEqual([]);
  });

  it("saves v2 format, deduplicates and keeps curriculum order", () => {
    const store = memoryStore();
    const first = SHELL_LESSONS[0]!.id;
    const second = SHELL_LESSONS[1]!.id;

    completeShellLesson(store, second);
    completeShellLesson(store, first);
    completeShellLesson(store, first);

    expect(loadShellCompleted(store)).toEqual([first, second]);
    const raw = JSON.parse(store.getItem(SHELL_LEARN_KEY) ?? "{}") as Record<string, unknown>;
    expect(raw["version"]).toBe(2);
    expect(raw["completed"]).toEqual([first, second]);

    saveShellCompleted(store, [second]);
    expect(loadShellCompleted(store)).toEqual([second]);
  });

  it("progress saved before the scripts units still loads", () => {
    // T54 AC-7: a pre-T54 save only knows lessons of units 1-9.
    const store = memoryStore();
    store.setItem(
      SHELL_LEARN_KEY,
      JSON.stringify({ version: 2, completed: ["u1-nav", "u5-loop", "u9-shortcuts"] }),
    );

    const completed = loadShellCompleted(store);
    expect(completed).toEqual(["u1-nav", "u5-loop", "u9-shortcuts"]);
    const done = new Set(completed);
    expect(SHELL_UNITS.map((u) => u.id).slice(9)).toEqual(["u10-scripts", "u11-controle"]);
    expect(unitStatus(SHELL_UNITS[9]!, done)).toBe("new");
    expect(unitStatus(SHELL_UNITS[10]!, done)).toBe("new");

    expect(completeShellLesson(store, "u10-first")).toEqual([
      "u1-nav",
      "u5-loop",
      "u9-shortcuts",
      "u10-first",
    ]);
  });
});
