import type { Key } from "./keys";
import { commandLevel, type Level } from "./levels";
import { execute, type Command, type SimpleName } from "./motions";
import type { VimState } from "./state";

export type KeyResult = {
  readonly state: VimState;
  /** The command the level does not allow ("f", "gg", "3"), or null. */
  readonly blocked: string | null;
};

const SIMPLE_KEYS = new Set<string>([..."hjklwbeWBE0^$G{}%;,nN*#"]);
const FIND_KEYS = new Set<string>(["f", "F", "t", "T"]);

/** A key that stands for itself: one character. */
const isChar = (key: Key): boolean => key.length === 1;
const isDigit = (key: Key): boolean => key.length === 1 && key >= "0" && key <= "9";

/**
 * Types one key in normal mode. Keys of commands the level does not have
 * are blocked: they move nothing and are reported.
 */
export function pressKey(state: VimState, key: Key, level: Level): KeyResult {
  const typed = state.pending;
  const ignore: KeyResult = { state: { ...state, pending: [] }, blocked: null };
  const block = (name: string): KeyResult => ({ state: { ...state, pending: [] }, blocked: name });
  const wait = (): KeyResult => ({ state: { ...state, pending: [...typed, key] }, blocked: null });
  // Only names of real commands are asked about, so each has a level.
  const allowed = (name: string): boolean => (commandLevel(name) as Level) <= level;
  const run = (command: Command): KeyResult => ({
    state: execute({ ...state, pending: [] }, command),
    blocked: null,
  });

  let digits = 0;
  while (isDigit(typed[digits] ?? "")) digits++;
  const count = digits > 0 ? Number(typed.slice(0, digits).join("")) : null;
  const head = typed[digits];

  if (key === "<Esc>") return ignore;

  if (head === "/" || head === "?") {
    if (key === "<CR>")
      return run({ name: head, pattern: typed.slice(digits + 1).join(""), count });
    if (key === "<BS>") {
      return typed.length === digits + 1
        ? ignore
        : { state: { ...state, pending: typed.slice(0, -1) }, blocked: null };
    }
    return isChar(key) ? wait() : { state, blocked: null };
  }

  if (head === "f" || head === "F" || head === "t" || head === "T") {
    return isChar(key) ? run({ name: head, char: key, count }) : ignore;
  }

  if (head === "g") {
    if (key === "e") return run({ name: "ge", count });
    if (key !== "g") return ignore;
    return allowed("gg") ? run({ name: "gg", count }) : block("gg");
  }

  // The start of a command, or more digits of its count.
  if (isDigit(key) && (key !== "0" || digits > 0)) {
    return allowed("count") ? wait() : block(key);
  }
  if (key === "g") return allowed("g") ? wait() : block(key);
  if (FIND_KEYS.has(key) || key === "/" || key === "?") {
    return allowed(key) ? wait() : block(key);
  }
  if (SIMPLE_KEYS.has(key)) {
    return allowed(key) ? run({ name: key as SimpleName, count }) : block(key);
  }
  return ignore;
}
