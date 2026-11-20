import type { TypingState } from "../typing/engine";
import type { WordsState } from "../typing/words-engine";
import type { TrainingEvent } from "./event";

/** One key that inserted something, as the typing run saw it. */
export type Stamp = {
  readonly at: number;
  /** Line (code) or word (text) the key belongs to. */
  readonly unit: number;
  readonly expected: string;
  readonly typed: string;
  readonly ok: boolean;
};

export type KeyTrace = readonly Stamp[];

/** `trace` plus the keys that took a code run from `before` to `after`. */
export function traceCode(
  _trace: KeyTrace,
  _before: TypingState,
  _after: TypingState,
  _now: number,
): KeyTrace {
  throw new Error("todo");
}

/** `trace` plus the keys that took a text run from `before` to `after`. */
export function traceText(
  _trace: KeyTrace,
  _before: WordsState,
  _after: WordsState,
  _now: number,
): KeyTrace {
  throw new Error("todo");
}

export type CodeMeta = {
  readonly at: number;
  /** The language. */
  readonly config: string;
  readonly seed: number;
  readonly snippetId: string;
};

/** One event per typed line. */
export function codeEvents(_trace: KeyTrace, _meta: CodeMeta): TrainingEvent[] {
  throw new Error("todo");
}

export type TextMeta = {
  readonly at: number;
  /** The `textConfigKey` of the options. */
  readonly config: string;
  readonly seed: number;
  readonly words: readonly string[];
};

/** One event per typed word. */
export function textEvents(_trace: KeyTrace, _meta: TextMeta): TrainingEvent[] {
  throw new Error("todo");
}
