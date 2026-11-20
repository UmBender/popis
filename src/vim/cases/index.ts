import { BASIC } from "./basic";
import type { VimCase } from "./case";
import { FIND } from "./find";
import { LINES } from "./lines";
import { SEARCH } from "./search";
import { WORDS } from "./words";

/** Every fidelity case (ADR-T13-1), shared by Vitest and the Neovim oracle. */
export const ALL_CASES: readonly VimCase[] = [...BASIC, ...WORDS, ...FIND, ...LINES, ...SEARCH];

/** The motion a case is about: its name up to the first ": ". */
export function motionOf(vimCase: VimCase): string {
  return vimCase[0].slice(0, vimCase[0].indexOf(": "));
}
