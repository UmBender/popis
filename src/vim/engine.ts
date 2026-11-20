import type { Key } from "./keys";
import type { Level } from "./levels";
import type { VimState } from "./state";

export type KeyResult = {
  readonly state: VimState;
  /** The command the level does not allow ("f", "gg", "3"), or null. */
  readonly blocked: string | null;
};

/**
 * Types one key in normal mode. Keys of commands the level does not have
 * are blocked: they move nothing and are reported.
 */
export function pressKey(_state: VimState, _key: Key, _level: Level): KeyResult {
  throw new Error("todo");
}
