import { GUIDE_ITEMS, isGuideItemId } from "../guide/content";
import { readJson, tryWriteJson, type KeyValueStore } from "./kv";

export const GUIDE_KEY = "popis.guide";

export type GuideState = {
  readonly checked: readonly string[];
};

export const EMPTY_GUIDE_STATE: GuideState = { checked: [] };

function canonicalOrder(ids: ReadonlySet<string>): string[] {
  return GUIDE_ITEMS.map((item) => item.id).filter((id) => ids.has(id));
}

/** Parses persisted guide state; corrupt or unknown entries are dropped. */
export function parseGuideState(value: unknown): GuideState {
  if (typeof value !== "object" || value === null) return EMPTY_GUIDE_STATE;
  const raw = (value as Record<string, unknown>)["checked"];
  if (!Array.isArray(raw)) return EMPTY_GUIDE_STATE;
  const valid = new Set(raw.filter(isGuideItemId));
  return { checked: canonicalOrder(valid) };
}

export function loadGuideState(store: KeyValueStore): GuideState {
  return parseGuideState(readJson(store, GUIDE_KEY));
}

export function saveGuideState(store: KeyValueStore, state: GuideState): void {
  tryWriteJson(store, GUIDE_KEY, state);
}

/** Toggles one known guide item id, keeping canonical item order. */
export function toggleGuideItem(state: GuideState, id: string): GuideState {
  if (!isGuideItemId(id)) return state;
  const next = new Set(state.checked);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return { checked: canonicalOrder(next) };
}

/** Clears all checked items and persists the empty state. */
export function resetGuideState(store: KeyValueStore): GuideState {
  saveGuideState(store, EMPTY_GUIDE_STATE);
  return EMPTY_GUIDE_STATE;
}
