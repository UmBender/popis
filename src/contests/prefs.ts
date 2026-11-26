import type { KeyValueStore } from "../storage/kv";
import type { Site } from "./model";

export const CONTESTS_KEY = "popis.contests";

export type ContestsPrefs = {
  readonly sites: readonly Site[];
};

export function loadContestsPrefs(_store: KeyValueStore): ContestsPrefs {
  throw new Error("todo");
}

export function saveContestsPrefs(_store: KeyValueStore, _prefs: ContestsPrefs): void {
  throw new Error("todo");
}
