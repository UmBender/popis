import type { RegisterKind } from "../vim/drills/register-edit";
import type { KeyValueStore } from "./history";

export const VIM_LEARN_KEY = "popis.vim-learn";

/** The unlocked kinds from parsed JSON, in the order of the list; bad data is dropped. */
export function parseUnlocked(_value: unknown): RegisterKind[] {
  throw new Error("todo");
}

export function loadUnlocked(_store: KeyValueStore): RegisterKind[] {
  throw new Error("todo");
}

export function saveUnlocked(_store: KeyValueStore, _kinds: readonly RegisterKind[]): void {
  throw new Error("todo");
}

/** Marks a kind as done in the Learn mode. */
export function unlockKind(_store: KeyValueStore, _kind: RegisterKind): void {
  throw new Error("todo");
}
