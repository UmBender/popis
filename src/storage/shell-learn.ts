import { SHELL_LESSONS } from "../shell/curriculum";
import { readJson, tryWriteJson, type KeyValueStore } from "./kv";

export const SHELL_LEARN_KEY = "popis.shell-learn";

const VALID_LESSON_IDS = new Set(SHELL_LESSONS.map((l) => l.id));

/**
 * Completed Shell lesson IDs from parsed JSON (`{ version: 2, completed }`),
 * deduplicated in curriculum order; unknown or corrupt entries are dropped.
 */
export function parseShellCompleted(value: unknown): string[] {
  const raw = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  const list = Array.isArray(raw["completed"]) ? raw["completed"] : [];
  const wanted = new Set(
    list.filter((id): id is string => typeof id === "string" && VALID_LESSON_IDS.has(id)),
  );
  return SHELL_LESSONS.map((l) => l.id).filter((id) => wanted.has(id));
}

export function loadShellCompleted(store: KeyValueStore): string[] {
  return parseShellCompleted(readJson(store, SHELL_LEARN_KEY));
}

export function saveShellCompleted(store: KeyValueStore, completed: readonly string[]): void {
  tryWriteJson(store, SHELL_LEARN_KEY, { version: 2, completed });
}

export function completeShellLesson(store: KeyValueStore, lessonId: string): string[] {
  const next = parseShellCompleted({ completed: [...loadShellCompleted(store), lessonId] });
  saveShellCompleted(store, next);
  return next;
}
