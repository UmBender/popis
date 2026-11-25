import type { KeyValueStore } from "./kv";

export const REGEX_LEARN_KEY = "popis.regex-learn";

export function parseRegexCompleted(_value: unknown): string[] {
  throw new Error("todo");
}

export function loadRegexCompleted(_store: KeyValueStore): string[] {
  throw new Error("todo");
}

export function saveRegexCompleted(_store: KeyValueStore, _completed: readonly string[]): void {
  throw new Error("todo");
}

export function completeRegexLesson(_store: KeyValueStore, _lessonId: string): string[] {
  throw new Error("todo");
}
