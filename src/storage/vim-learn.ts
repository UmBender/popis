import { REGISTER_KINDS, type RegisterKind } from "../vim/drills/register-edit";
import type { KeyValueStore } from "./history";

export const VIM_LEARN_KEY = "popis.vim-learn";

/** The unlocked kinds from parsed JSON, in the order of the list; bad data is dropped. */
export function parseUnlocked(value: unknown): RegisterKind[] {
  const raw = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  const wanted = Array.isArray(raw["unlocked"]) ? raw["unlocked"] : [];
  return REGISTER_KINDS.filter((kind) => wanted.includes(kind));
}

export function loadUnlocked(store: KeyValueStore): RegisterKind[] {
  try {
    const text = store.getItem(VIM_LEARN_KEY);
    return parseUnlocked(text === null ? undefined : (JSON.parse(text) as unknown));
  } catch {
    return [];
  }
}

/** Best effort: a full or blocked store must not break the screen. */
export function saveUnlocked(store: KeyValueStore, kinds: readonly RegisterKind[]): void {
  try {
    store.setItem(VIM_LEARN_KEY, JSON.stringify({ unlocked: kinds }));
  } catch {
    // The kind stays unlocked until the screen closes.
  }
}

/** Marks a kind as done in the Learn mode. */
export function unlockKind(store: KeyValueStore, kind: RegisterKind): void {
  saveUnlocked(store, parseUnlocked({ unlocked: [...loadUnlocked(store), kind] }));
}

export function parseCompleted(_value: unknown): string[] {
  throw new Error("todo");
}

export function loadCompleted(_store: KeyValueStore): string[] {
  throw new Error("todo");
}

export function saveCompleted(_store: KeyValueStore, _completed: readonly string[]): void {
  throw new Error("todo");
}

export function completeLesson(_store: KeyValueStore, _lessonId: string): string[] {
  throw new Error("todo");
}
