import { describe, expect, it } from "vitest";
import { REGEX_LESSONS } from "../regex/curriculum";
import { memoryStore } from "./history";
import {
  completeRegexLesson,
  loadRegexCompleted,
  parseRegexCompleted,
  REGEX_LEARN_KEY,
  saveRegexCompleted,
} from "./regex-learn";

// T45 AC-7: regex learn progress stored in popis.regex-learn (v2 format).

describe("regex-learn storage", () => {
  it("uses popis.regex-learn and persists completed lesson IDs in curriculum order", () => {
    expect(REGEX_LEARN_KEY).toBe("popis.regex-learn");
    const store = memoryStore();
    expect(loadRegexCompleted(store)).toEqual([]);

    const first = REGEX_LESSONS[0]!.id;
    const second = REGEX_LESSONS[1]!.id;
    expect(completeRegexLesson(store, second)).toEqual([second]);
    expect(completeRegexLesson(store, first)).toEqual([first, second]);
    expect(completeRegexLesson(store, first)).toEqual([first, second]);

    const raw = JSON.parse(store.getItem(REGEX_LEARN_KEY) ?? "{}") as Record<string, unknown>;
    expect(raw["version"]).toBe(2);
    expect(loadRegexCompleted(store)).toEqual([first, second]);
  });

  it("drops unknown or corrupt entries when parsing", () => {
    const store = memoryStore();
    saveRegexCompleted(store, [REGEX_LESSONS[0]!.id]);
    expect(parseRegexCompleted(null)).toEqual([]);
    expect(parseRegexCompleted({ completed: ["nonexistent", 42, REGEX_LESSONS[0]!.id] })).toEqual([
      REGEX_LESSONS[0]!.id,
    ]);
  });
});
