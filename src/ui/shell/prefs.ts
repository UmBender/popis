import type { KeyValueStore } from "../../storage/kv";
import type { ItemId } from "./sections";

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

export function loadPrefs(store: KeyValueStore): ShellPrefs {
  void store;
  throw new Error("todo");
}

export function savePrefs(store: KeyValueStore, prefs: ShellPrefs): void {
  void store;
  void prefs;
  throw new Error("todo");
}
