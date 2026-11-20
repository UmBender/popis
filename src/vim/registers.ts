import type { Key } from "./keys";
import type { Register, VimState } from "./state";

/** One register as `getreg()` and `getregtype()` report it. */
export type RegisterSummary = {
  readonly reg: string;
  readonly regtype: "v" | "V" | `\x16${number}`;
};

/** One line of the register list, as `:reg` shows it. */
export type RegisterLine = {
  readonly name: string;
  readonly type: "c" | "l" | "b";
  /** Line breaks as `^J` and control characters as `^X`. */
  readonly text: string;
};

/** The register `name` (`"`, `0`-`9`, `-`, `a`-`z`, `A`-`Z`, `_`), or null when empty or unknown. */
export function getRegister(_state: VimState, _name: string): Register | null {
  throw new Error("todo");
}

/** Every register that is not empty among `0`-`9`, `-` and `a`-`z`, for the oracle. */
export function registersView(_state: VimState): Record<string, RegisterSummary> {
  throw new Error("todo");
}

/** The non-empty registers in the order of `:reg`: `"`, `0`-`9`, `-`, `a`-`z`. */
export function listRegisters(_state: VimState): readonly RegisterLine[] {
  throw new Error("todo");
}

/** The text a recording leaves in a register: `<Esc>` is 0x1b, `<CR>` is `\r`. */
export function macroText(_keys: readonly Key[]): string {
  throw new Error("todo");
}

/** The inverse of `macroText`. */
export function macroKeys(_text: string): Key[] {
  throw new Error("todo");
}
