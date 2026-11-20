import type { Key } from "./keys";
import type { Register, VimState } from "./state";

/** The text `getreg('"')` gives: "a\nb" for characters, "a\n" for lines. */
export function registerText(register: Register): string {
  return register.lines.join("\n") + (register.linewise ? "\n" : "");
}

/** The unnamed register as the Neovim oracle reports it. */
export function registerView(state: VimState): { reg: string; regtype: "" | "v" | "V" } {
  const { register } = state;
  if (register === null) return { reg: "", regtype: "" };
  return { reg: registerText(register), regtype: register.linewise ? "V" : "v" };
}

/**
 * Types one key with every command allowed: movements, operators, text
 * objects, the insert commands, `u`, `<C-r>` and `.` (ADR-T14-1).
 */
export function pressEditKey(state: VimState, key: Key): VimState {
  void state;
  void key;
  throw new Error("todo");
}
