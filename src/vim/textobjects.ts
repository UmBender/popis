import type { Pos } from "./state";

/**
 * The range a text object gives, as Vim's operators read it: `end` is the
 * last character when `inclusive`, and the first one left out otherwise.
 */
export type TextRange = {
  readonly start: Pos;
  readonly end: Pos;
  readonly inclusive: boolean;
};

/** The text object keys: "iw", "a(", 'i"'... */
export const TEXT_OBJECTS: readonly string[] = [
  ...["iw", "aw", "iW", "aW", "ib", "ab", "iB", "aB"],
  ...[
    "i(",
    "a(",
    "i)",
    "a)",
    "i{",
    "a{",
    "i}",
    "a}",
    "i[",
    "a[",
    "i]",
    "a]",
    "i<",
    "a<",
    "i>",
    "a>",
  ],
  ...['i"', 'a"', "i'", "a'", "i`", "a`"],
];

/**
 * The text object `object` ("iw", "a(", 'i"') around `cursor`, or null when
 * there is none. Ports of Vim's current_word(), current_block() and
 * current_quote().
 */
export function textObject(
  lines: readonly string[],
  cursor: Pos,
  object: string,
  count: number,
): TextRange | null {
  void lines;
  void cursor;
  void object;
  void count;
  throw new Error("todo");
}
