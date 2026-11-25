import { REGEX_LESSONS } from "../regex/curriculum";
import { readJson, tryWriteJson, type KeyValueStore } from "./kv";

export const REGEX_LEARN_KEY = "popis.regex-learn";

const VALID_LESSON_IDS = new Set(REGEX_LESSONS.map((l) => l.id));

/**
 * Completed Regex lesson IDs from parsed JSON (`{ version: 2, completed }`),
 * deduplicated in curriculum order; unknown or corrupt entries are dropped.
 */
export function parseRegexCompleted(value: unknown): string[] {
  const raw = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  const list = Array.isArray(raw["completed"]) ? raw["completed"] : [];
  const wanted = new Set(
    list.filter((id): id is string => typeof id === "string" && VALID_LESSON_IDS.has(id)),
  );
  return REGEX_LESSONS.map((l) => l.id).filter((id) => wanted.has(id));
}

export function loadRegexCompleted(store: KeyValueStore): string[] {
  return parseRegexCompleted(readJson(store, REGEX_LEARN_KEY));
}

export function saveRegexCompleted(store: KeyValueStore, completed: readonly string[]): void {
  tryWriteJson(store, REGEX_LEARN_KEY, { version: 2, completed });
}

export function completeRegexLesson(store: KeyValueStore, lessonId: string): string[] {
  const next = parseRegexCompleted({ completed: [...loadRegexCompleted(store), lessonId] });
  saveRegexCompleted(store, next);
  return next;
}
