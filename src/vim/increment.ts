import { normalCursor, replaceLine, snapshot, withUndo } from "./buffer";
import type { Change, VimState } from "./state";

type Found = {
  readonly start: number;
  readonly end: number;
  readonly kind: "dec" | "hex" | "bin";
  readonly negative: boolean;
};

const NUMBER = /0[xX][0-9a-fA-F]+|0[bB][01]+|\d+/g;

/** The first number that ends at or after `col`: `nrformats=bin,hex`, and a `-` before a decimal. */
function findNumber(text: string, col: number): Found | null {
  for (const match of text.matchAll(NUMBER)) {
    const end = match.index + match[0].length;
    if (end <= col) continue;
    const prefix = match[0].slice(0, 2).toLowerCase();
    const kind = prefix === "0x" && match[0].length > 1 ? "hex" : prefix === "0b" ? "bin" : "dec";
    const negative = kind === "dec" && text.charAt(match.index - 1) === "-";
    return { start: negative ? match.index - 1 : match.index, end, kind, negative };
  }
  return null;
}

const MASK = (1n << 64n) - 1n;

/** The text that replaces the number: same base, same width, same case. */
function addTo(text: string, found: Found, delta: number): string {
  const body = found.negative ? text.slice(1) : text;
  if (found.kind === "dec") {
    const value = (found.negative ? -1 : 1) * Number(body) + delta;
    const digits = String(Math.abs(value));
    const padded =
      body.length > 1 && body.startsWith("0") ? digits.padStart(body.length, "0") : digits;
    return (value < 0 ? "-" : "") + padded;
  }
  const radix = found.kind === "hex" ? 16 : 2;
  const digits = body.slice(2);
  const value = (BigInt(`0${body.charAt(1)}${digits}`) + BigInt(delta)) & MASK;
  let next = value.toString(radix);
  if (found.kind === "hex") {
    const letter = [...digits].reverse().find((ch) => /[a-f]/i.test(ch));
    if (letter !== undefined && letter === letter.toUpperCase()) next = next.toUpperCase();
  }
  return body.slice(0, 2) + next.padStart(digits.length, "0");
}

/** `<C-a>` (sign 1) and `<C-x>` (sign -1): add `count` to the next number of the line. */
export function incrementAt(state: VimState, count: number | null, sign: 1 | -1): VimState {
  const { line, col } = state.cursor;
  const text = state.lines[line] as string;
  const found = findNumber(text, col);
  if (found === null) return { ...state, failed: true };
  const old = text.slice(found.start, found.end);
  const replaced = addTo(old, found, sign * (count ?? 1));
  const lines = replaceLine(
    state.lines,
    line,
    text.slice(0, found.start) + replaced + text.slice(found.end),
  );
  const cursor = normalCursor(lines, line, found.start + replaced.length - 1);
  const change: Change = { count, keys: [sign === 1 ? "<C-a>" : "<C-x>"], typed: [] };
  const moved = { ...state, lines, cursor, curswant: cursor.col, lastChange: change };
  return withUndo(state, snapshot(state), moved);
}
