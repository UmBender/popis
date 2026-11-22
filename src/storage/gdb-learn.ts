import type { KeyValueStore } from "./history";

export const GDB_LEARN_KEY = "popis.gdb-learn";

export function parseGdbCompleted(_value: unknown): string[] {
  throw new Error("todo");
}

export function loadGdbCompleted(_store: KeyValueStore): string[] {
  throw new Error("todo");
}

export function saveGdbCompleted(_store: KeyValueStore, _completed: readonly string[]): void {
  throw new Error("todo");
}

export function completeGdbLesson(_store: KeyValueStore, _lessonId: string): string[] {
  throw new Error("todo");
}
