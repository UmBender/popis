import type { Level } from "./levels";
import type { Pos, VimState } from "./state";

export type Solution = {
  /** The keys in Vim notation, such as "f(" or "/ab<CR>". */
  readonly keys: string;
  /** The number of keys; each key is 1. */
  readonly cost: number;
};

/**
 * The fewest keys that take the cursor to `target` with the movements of
 * `level`, or null when it needs more than `maxKeys`.
 */
export function optimalSolution(
  _state: VimState,
  _target: Pos,
  _level: Level,
  _maxKeys?: number,
): Solution | null {
  throw new Error("todo");
}
