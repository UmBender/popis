import type { FindKind, VimState } from "./state";

/** Movements that take only a count. */
export type SimpleName =
  | "h"
  | "j"
  | "k"
  | "l"
  | "w"
  | "b"
  | "e"
  | "W"
  | "B"
  | "E"
  | "ge"
  | "0"
  | "^"
  | "$"
  | "gg"
  | "G"
  | "{"
  | "}"
  | "%"
  | ";"
  | ","
  | "n"
  | "N"
  | "*"
  | "#";

/** A complete normal-mode movement: what the typed keys add up to. */
export type Command =
  | { readonly name: SimpleName; readonly count: number | null }
  | { readonly name: FindKind; readonly char: string; readonly count: number | null }
  | { readonly name: "/" | "?"; readonly pattern: string; readonly count: number | null };

/** Runs a movement like Neovim does; a failing movement leaves the cursor. */
export function execute(_state: VimState, _command: Command): VimState {
  throw new Error("todo");
}
