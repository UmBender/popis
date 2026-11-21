import { readJson, tryWriteJson, type KeyValueStore } from "../../storage/kv";
import { isItemId, type ItemId } from "./sections";

export const SHELL_KEY = "popis.shell.v1";

/** What the window remembers between visits (ADR-T18-1). */
export type ShellPrefs = {
  /** The chosen item; a mode item defers to the stored settings' mode. */
  readonly item: ItemId | null;
  /** The tree is collapsed on wide screens. */
  readonly collapsed: boolean;
  /** Ids of the closed folders. */
  readonly closed: readonly string[];
  /** Ids of the reference panels left open. */
  readonly open: readonly string[];
};

export const DEFAULT_PREFS: ShellPrefs = { item: null, collapsed: false, closed: [], open: [] };

const strings = (value: unknown): readonly string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];

export function loadPrefs(store: KeyValueStore): ShellPrefs {
  const raw = readJson(store, SHELL_KEY);
  if (typeof raw !== "object" || raw === null) return DEFAULT_PREFS;
  const value = raw as Readonly<Record<string, unknown>>;
  return {
    item: isItemId(value["item"]) ? value["item"] : null,
    collapsed: value["collapsed"] === true,
    closed: strings(value["closed"]),
    open: strings(value["open"]),
  };
}

export function savePrefs(store: KeyValueStore, prefs: ShellPrefs): void {
  tryWriteJson(store, SHELL_KEY, prefs);
}
