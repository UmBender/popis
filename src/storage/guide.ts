import type { KeyValueStore } from "./kv";

export const GUIDE_KEY = "popis.guide";

export type GuideState = {
  readonly checked: readonly string[];
};

export const EMPTY_GUIDE_STATE: GuideState = { checked: [] };

export function parseGuideState(_value: unknown): GuideState {
  throw new Error("todo");
}

export function loadGuideState(_store: KeyValueStore): GuideState {
  throw new Error("todo");
}

export function saveGuideState(_store: KeyValueStore, _state: GuideState): void {
  throw new Error("todo");
}

export function toggleGuideItem(_state: GuideState, _id: string): GuideState {
  throw new Error("todo");
}

export function resetGuideState(_store: KeyValueStore): GuideState {
  throw new Error("todo");
}
