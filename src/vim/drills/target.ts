import type { Level } from "../levels";
import type { Pos } from "../state";

/** One target of a round (AC-6). */
export type VimTarget = {
  readonly index: number;
  /** `deriveSeed(roundSeed, index)`. */
  readonly seed: number;
  readonly level: Level;
  readonly snippetId: string;
  readonly lines: readonly string[];
  readonly start: Pos;
  readonly target: Pos;
  /** Keys of the optimal solution. */
  readonly minimum: number;
  /** The optimal solution in Vim notation. */
  readonly solution: string;
};

/** Fewest and most optimal keys a target of the level may need. */
export function targetLimits(_level: Level): { readonly min: number; readonly max: number } {
  throw new Error("todo");
}

/** The `index`-th target of the round with `seed`. */
export function generateTarget(_seed: number, _index: number, _level: Level): VimTarget {
  throw new Error("todo");
}
