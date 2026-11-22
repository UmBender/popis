import { GDB_LESSONS } from "../gdb/curriculum";
import { readJson, tryWriteJson, type KeyValueStore } from "./kv";

export const GDB_LEARN_KEY = "popis.gdb-learn";

const VALID_LESSON_IDS = new Set(GDB_LESSONS.map((l) => l.id));

/**
 * Completed GDB lesson IDs from parsed JSON (`{ version: 2, completed }`),
 * deduplicated in curriculum order; unknown or corrupt entries are dropped.
 */
export function parseGdbCompleted(value: unknown): string[] {
  const raw = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  const list = Array.isArray(raw["completed"]) ? raw["completed"] : [];
  const wanted = new Set(
    list.filter((id): id is string => typeof id === "string" && VALID_LESSON_IDS.has(id)),
  );
  return GDB_LESSONS.map((l) => l.id).filter((id) => wanted.has(id));
}

export function loadGdbCompleted(store: KeyValueStore): string[] {
  return parseGdbCompleted(readJson(store, GDB_LEARN_KEY));
}

export function saveGdbCompleted(store: KeyValueStore, completed: readonly string[]): void {
  tryWriteJson(store, GDB_LEARN_KEY, { version: 2, completed });
}

export function completeGdbLesson(store: KeyValueStore, lessonId: string): string[] {
  const next = parseGdbCompleted({ completed: [...loadGdbCompleted(store), lessonId] });
  saveGdbCompleted(store, next);
  return next;
}
