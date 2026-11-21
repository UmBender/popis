import { ALL_LESSONS } from "../vim/curriculum";
import { REGISTER_KINDS, type RegisterKind } from "../vim/drills/register-edit";
import type { KeyValueStore } from "./history";

export const VIM_LEARN_KEY = "popis.vim-learn";

const VALID_LESSON_IDS = new Set(ALL_LESSONS.map((l) => l.id));

/**
 * Completed lesson IDs from parsed JSON (v2 `{ version: 2, completed }` or
 * v1 T16 `{ unlocked }`), deduplicated in curriculum order; bad data is dropped.
 */
export function parseCompleted(value: unknown): string[] {
  const raw = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  const list = Array.isArray(raw["completed"])
    ? raw["completed"]
    : Array.isArray(raw["unlocked"])
      ? raw["unlocked"]
      : [];
  const wanted = new Set(
    list.filter((id): id is string => typeof id === "string" && VALID_LESSON_IDS.has(id)),
  );
  return ALL_LESSONS.map((l) => l.id).filter((id) => wanted.has(id));
}

export function loadCompleted(store: KeyValueStore): string[] {
  try {
    const text = store.getItem(VIM_LEARN_KEY);
    return parseCompleted(text === null ? undefined : (JSON.parse(text) as unknown));
  } catch {
    return [];
  }
}

/** Best effort: a full or blocked store must not break the screen. */
export function saveCompleted(store: KeyValueStore, completed: readonly string[]): void {
  try {
    store.setItem(VIM_LEARN_KEY, JSON.stringify({ version: 2, completed }));
  } catch {
    // Progress stays in memory until the screen closes.
  }
}

/** Marks any curriculum lesson as completed, migrating v1 data if present. */
export function completeLesson(store: KeyValueStore, lessonId: string): string[] {
  const next = parseCompleted({ completed: [...loadCompleted(store), lessonId] });
  saveCompleted(store, next);
  return next;
}

/** The unlocked register kinds from parsed JSON (v1 or v2), in REGISTER_KINDS order. */
export function parseUnlocked(value: unknown): RegisterKind[] {
  const completed = parseCompleted(value);
  return REGISTER_KINDS.filter((kind) => completed.includes(kind));
}

export function loadUnlocked(store: KeyValueStore): RegisterKind[] {
  try {
    const text = store.getItem(VIM_LEARN_KEY);
    return parseUnlocked(text === null ? undefined : (JSON.parse(text) as unknown));
  } catch {
    return [];
  }
}

/** Saves unlocked register kinds (preserving non-register completed lessons if any). */
export function saveUnlocked(store: KeyValueStore, kinds: readonly RegisterKind[]): void {
  const others = loadCompleted(store).filter(
    (id) => !(REGISTER_KINDS as readonly string[]).includes(id),
  );
  saveCompleted(store, parseCompleted({ completed: [...others, ...kinds] }));
}

/** Marks a register kind as done in the Learn mode. */
export function unlockKind(store: KeyValueStore, kind: RegisterKind): void {
  completeLesson(store, kind);
}
