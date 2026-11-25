import { describe, expect, it } from "vitest";
import { SHELL_LESSONS } from "../shell/curriculum";
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
});
