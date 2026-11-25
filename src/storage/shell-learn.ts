import type { KeyValueStore } from "./kv";

export const SHELL_LEARN_KEY = "popis.shell-learn";

export function parseShellCompleted(_value: unknown): string[] {
  throw new Error("todo");
}

export function loadShellCompleted(_store: KeyValueStore): string[] {
  throw new Error("todo");
}

export function saveShellCompleted(_store: KeyValueStore, _completed: readonly string[]): void {
  throw new Error("todo");
}

export function completeShellLesson(_store: KeyValueStore, _lessonId: string): string[] {
  throw new Error("todo");
}
