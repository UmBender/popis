import type { Key } from "./keys";
import type { VimState } from "./state";

/** The columns `[from, to)` of `line` the selection covers, or null. */
export function selectionRange(
  state: VimState,
  line: number,
): { readonly from: number; readonly to: number } | null {
  void state;
  void line;
  throw new Error("todo");
}

/** One key typed in visual mode. */
export function pressVisual(state: VimState, key: Key): VimState {
  void key;
  void state;
  throw new Error("todo");
}
