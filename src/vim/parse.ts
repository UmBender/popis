import type { Key } from "./keys";
import type { Command, SimpleName } from "./motions";
import type { FindKind } from "./state";
import { TEXT_OBJECTS } from "./textobjects";

/** The operators that take a movement, a text object or a doubled key. */
export type Op = "d" | "c" | "y" | ">" | "<";

/** A movement as typed: its name, the character or pattern it takes, and its keys. */
export type Motion = {
  readonly name: string;
  readonly char?: string;
  readonly pattern?: string;
  readonly keys: readonly Key[];
};

export type Target =
  | { readonly kind: "line" }
  | { readonly kind: "object"; readonly object: string }
  | { readonly kind: "motion"; readonly motion: Motion };

export type Parsed =
  | { readonly kind: "incomplete"; readonly searching: boolean; readonly patternLength: number }
  | { readonly kind: "invalid" }
  | { readonly kind: "motion"; readonly count: number | null; readonly motion: Motion }
  | {
      readonly kind: "operator";
      readonly op: Op;
      readonly count: number | null;
      readonly target: Target;
    }
  | {
      readonly kind: "command";
      readonly name: string;
      readonly count: number | null;
      readonly arg: string;
    };

/** What the keys typed in visual mode add up to. */
export type VisualParsed =
  | { readonly kind: "incomplete" }
  | { readonly kind: "invalid" }
  | { readonly kind: "motion"; readonly count: number | null; readonly motion: Motion }
  | { readonly kind: "object"; readonly count: number | null; readonly object: string }
  | {
      readonly kind: "command";
      readonly name: string;
      readonly count: number | null;
      readonly arg: string;
    };

const SIMPLE_MOTIONS = new Set<string>([..."hjklwbeWBE0^$G{}%;,nN*#"]);
const FIND_KEYS = new Set<string>(["f", "F", "t", "T"]);
const COMMANDS = new Set<string>([..."xXDCsS~pPYuaiAIoO.JvV:", "<C-r>", "<C-v>"]);
const OPERATORS = new Set<string>(["d", "c", "y", ">", "<"]);
const VISUAL_COMMANDS = new Set<string>([..."vVoOdxycs><~JIA:", "<C-v>"]);

const INVALID: Parsed = { kind: "invalid" };
const WAIT: Parsed = { kind: "incomplete", searching: false, patternLength: 0 };

const isDigit = (key: Key): boolean => key.length === 1 && key >= "0" && key <= "9";
export const isChar = (key: Key): boolean => key.length === 1;

/** A count at `from`; a leading 0 is the movement, not a count. */
export function readCount(
  keys: readonly Key[],
  from: number,
): { count: number | null; next: number } {
  let count: number | null = null;
  let i = from;
  for (let key = keys[i]; key !== undefined && isDigit(key); key = keys[i]) {
    if (count === null && key === "0") break;
    count = (count ?? 0) * 10 + Number(key);
    i++;
  }
  return { count, next: i };
}

export function parseMotion(keys: readonly Key[], i: number): Motion | Parsed {
  // The caller checked that a key is there.
  const key = keys[i] as Key;
  if (SIMPLE_MOTIONS.has(key)) return { name: key, keys: [key] };
  if (FIND_KEYS.has(key)) {
    const char = keys[i + 1];
    if (char === undefined) return WAIT;
    return isChar(char) ? { name: key, char, keys: [key, char] } : INVALID;
  }
  if (key === "g") {
    const next = keys[i + 1];
    if (next === undefined) return WAIT;
    if (next === "g" || next === "e") return { name: `g${next}`, keys: [key, next] };
    return INVALID;
  }
  if (key === "/" || key === "?") {
    let pattern = "";
    for (let j = i + 1; j < keys.length; j++) {
      const k = keys[j] as Key;
      if (k === "<CR>") return { name: key, pattern, keys: keys.slice(i, j + 1) };
      if (!isChar(k)) return INVALID;
      pattern += k;
    }
    return { kind: "incomplete", searching: true, patternLength: pattern.length };
  }
  return INVALID;
}

export const isMotion = (value: Motion | Parsed): value is Motion =>
  "name" in value && "keys" in value;

/** What the keys typed so far add up to. */
export function parse(keys: readonly Key[]): Parsed {
  const first = readCount(keys, 0);
  const key = keys[first.next];
  if (key === undefined) return WAIT;

  if (OPERATORS.has(key)) {
    const second = readCount(keys, first.next + 1);
    const next = keys[second.next];
    if (next === undefined) return WAIT;
    const count =
      first.count === null && second.count === null
        ? null
        : (first.count ?? 1) * (second.count ?? 1);
    const op = key as Op;
    if (next === key) return { kind: "operator", op, count, target: { kind: "line" } };
    if (next === "i" || next === "a") {
      const which = keys[second.next + 1];
      if (which === undefined) return WAIT;
      const object = `${next}${which}`;
      return TEXT_OBJECTS.includes(object)
        ? { kind: "operator", op, count, target: { kind: "object", object } }
        : INVALID;
    }
    const motion = parseMotion(keys, second.next);
    if (!isMotion(motion)) return motion;
    return { kind: "operator", op, count, target: { kind: "motion", motion } };
  }

  if (key === "r") {
    const char = keys[first.next + 1];
    if (char === undefined) return WAIT;
    return isChar(char) || char === "<CR>"
      ? { kind: "command", name: "r", count: first.count, arg: char }
      : INVALID;
  }
  if (key === "g" && keys[first.next + 1] === "v") {
    return { kind: "command", name: "gv", count: first.count, arg: "" };
  }
  if (COMMANDS.has(key)) return { kind: "command", name: key, count: first.count, arg: "" };

  const motion = parseMotion(keys, first.next);
  if (!isMotion(motion)) return motion;
  return { kind: "motion", count: first.count, motion };
}

/** What the keys typed so far in visual mode add up to. */
export function parseVisual(keys: readonly Key[]): VisualParsed {
  const first = readCount(keys, 0);
  const key = keys[first.next];
  if (key === undefined) return { kind: "incomplete" };
  const count = first.count;

  if (key === "i" || key === "a") {
    const which = keys[first.next + 1];
    if (which === undefined) return { kind: "incomplete" };
    const object = `${key}${which}`;
    return TEXT_OBJECTS.includes(object) ? { kind: "object", count, object } : { kind: "invalid" };
  }
  if (key === "r") {
    const char = keys[first.next + 1];
    if (char === undefined) return { kind: "incomplete" };
    return isChar(char) ? { kind: "command", name: "r", count, arg: char } : { kind: "invalid" };
  }
  if (VISUAL_COMMANDS.has(key)) return { kind: "command", name: key, count, arg: "" };

  const motion = parseMotion(keys, first.next);
  if (isMotion(motion)) return { kind: "motion", count, motion };
  return motion.kind === "incomplete" ? { kind: "incomplete" } : { kind: "invalid" };
}

export function toCommand(motion: Motion, count: number | null): Command {
  if (motion.char !== undefined) {
    return { name: motion.name as FindKind, char: motion.char, count };
  }
  if (motion.pattern !== undefined) {
    return { name: motion.name as "/" | "?", pattern: motion.pattern, count };
  }
  return { name: motion.name as SimpleName, count };
}
