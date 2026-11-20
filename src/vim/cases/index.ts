import { BASIC } from "./basic";
import type { EditCase, RegisterCase, VimCase } from "./case";
import { REG_INSERT } from "./reg-insert";
import { REG_MACROS } from "./reg-macros";
import { REG_NAMED } from "./reg-named";
import { REG_NUMBER } from "./reg-number";
import { REG_NUMBERED } from "./reg-numbered";
import { EDIT_EDGES } from "./edit-edges";
import { EDIT_GRID } from "./edit-grid";
import { EDIT_INSERT } from "./edit-insert";
import { EDIT_OBJECTS } from "./edit-objects";
import { EDIT_OPERATORS } from "./edit-operators";
import { EDIT_UNDO } from "./edit-undo";
import { EX_SUB } from "./ex-sub";
import { FIND } from "./find";
import { LINES } from "./lines";
import { SEARCH } from "./search";
import { SHIFT_JOIN } from "./shift-join";
import { VISUAL_BLOCK } from "./visual-block";
import { VISUAL_OPS } from "./visual-ops";
import { VISUAL_SELECT } from "./visual-select";
import { WORDS } from "./words";

/** Every fidelity case (ADR-T13-1), shared by Vitest and the Neovim oracle. */
export const ALL_CASES: readonly VimCase[] = [...BASIC, ...WORDS, ...FIND, ...LINES, ...SEARCH];

/** Every edit case (ADR-T14-1): they also check the buffer and the register. */
export const EDIT_CASES: readonly EditCase[] = [
  ...EDIT_INSERT,
  ...EDIT_OPERATORS,
  ...EDIT_OBJECTS,
  ...EDIT_UNDO,
  ...EDIT_EDGES,
  ...EDIT_GRID,
];

/**
 * Every visual, shift, join and `:s` case (ADR-T15-1). Apart from `EDIT_CASES`
 * because a block register has its own type, which the T14 tests do not expect.
 */
export const VISUAL_CASES: readonly EditCase[] = [
  ...VISUAL_SELECT,
  ...VISUAL_OPS,
  ...VISUAL_BLOCK,
  ...SHIFT_JOIN,
  ...EX_SUB,
];

/**
 * Every register, macro and `<C-a>` case (ADR-T16-1): they also check the
 * registers `0`–`9`, `-` and `a`–`z`.
 */
export const REGISTER_CASES: readonly RegisterCase[] = [
  ...REG_NAMED,
  ...REG_NUMBERED,
  ...REG_MACROS,
  ...REG_NUMBER,
  ...REG_INSERT,
];

/** The motion or command a case is about: its name up to the first ": ". */
export function motionOf(vimCase: VimCase | EditCase | RegisterCase): string {
  return vimCase[0].slice(0, vimCase[0].indexOf(": "));
}
