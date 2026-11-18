/** Where `typed` holds a newline and indentation inserted by one Enter. */
export type AutoIndent = { readonly from: number; readonly to: number };

/** A typing run over one target text; every function returns a new state. */
export type TypingState = {
  readonly target: string;
  readonly typed: string;
  /** Clock time of the first key, or null before it. */
  readonly startedAt: number | null;
  /** Clock time when `typed` became equal to `target`. */
  readonly finishedAt: number | null;
  /** Keys that inserted a character, Enter included. */
  readonly keystrokes: number;
  /** Of those, the ones that matched the target at their position. */
  readonly correct: number;
  readonly autoIndents: readonly AutoIndent[];
};

export type Mark = "correct" | "wrong" | "pending";

export type TypingStats = {
  readonly wpm: number;
  readonly accuracy: number;
  readonly errors: number;
  readonly timeMs: number;
};

export function startTyping(target: string): TypingState {
  return {
    target,
    typed: "",
    startedAt: null,
    finishedAt: null,
    keystrokes: 0,
    correct: 0,
    autoIndents: [],
  };
}

export function isFinished(state: TypingState): boolean {
  return state.finishedAt !== null;
}

/** Whether a key can still insert something. */
function open(state: TypingState): boolean {
  return !isFinished(state) && state.typed.length < state.target.length;
}

/** Appends `inserted` for one key that was right or wrong at its position. */
function insert(
  state: TypingState,
  inserted: string,
  right: boolean,
  now: number,
  autoIndents = state.autoIndents,
): TypingState {
  const typed = state.typed + inserted;
  return {
    ...state,
    typed,
    startedAt: state.startedAt ?? now,
    finishedAt: typed === state.target ? now : null,
    keystrokes: state.keystrokes + 1,
    correct: state.correct + (right ? 1 : 0),
    autoIndents,
  };
}

function typeChar(state: TypingState, ch: string, now: number): TypingState {
  if (!open(state)) return state;
  return insert(state, ch, state.target[state.typed.length] === ch, now);
}

/** Types `text` key by key; a "\n" in it is pressed as Enter. */
export function typeText(state: TypingState, text: string, now: number): TypingState {
  let next = state;
  for (const ch of text) next = ch === "\n" ? pressEnter(next, now) : typeChar(next, ch, now);
  return next;
}

/**
 * Enter where the target has a newline inserts it with the next line's
 * indentation (auto-indent); anywhere else it inserts a wrong newline.
 */
export function pressEnter(state: TypingState, now: number): TypingState {
  if (!open(state)) return state;
  const at = state.typed.length;
  if (state.target[at] !== "\n") return insert(state, "\n", false, now);
  const indent = /^ */.exec(state.target.slice(at + 1))?.[0] ?? "";
  const inserted = `\n${indent}`;
  const autoIndents =
    indent === ""
      ? state.autoIndents
      : [...state.autoIndents, { from: at, to: at + inserted.length }];
  return insert(state, inserted, true, now, autoIndents);
}

/** Deletes one character, or a whole automatic newline and indentation. */
export function backspace(state: TypingState): TypingState {
  if (isFinished(state) || state.typed === "") return state;
  const last = state.autoIndents.at(-1);
  if (last?.to === state.typed.length) {
    return {
      ...state,
      typed: state.typed.slice(0, last.from),
      autoIndents: state.autoIndents.slice(0, -1),
    };
  }
  return { ...state, typed: state.typed.slice(0, -1) };
}

/** Mark of every target position. */
export function marks(state: TypingState): Mark[] {
  return [...state.target].map((ch, i) =>
    i >= state.typed.length ? "pending" : state.typed[i] === ch ? "correct" : "wrong",
  );
}

/** Characters the player types: the target without the indentation of lines 2 on. */
export function typeableLength(target: string): number {
  const indentation = target
    .split("\n")
    .slice(1)
    .reduce((sum, line) => sum + (/^ */.exec(line)?.[0].length ?? 0), 0);
  return target.length - indentation;
}

export function typingStats(state: TypingState): TypingStats {
  if (state.finishedAt === null || state.startedAt === null) {
    throw new RangeError("typing stats need a finished run");
  }
  const timeMs = state.finishedAt - state.startedAt;
  const minutes = timeMs / 60_000;
  return {
    wpm: timeMs > 0 ? typeableLength(state.target) / 5 / minutes : 0,
    accuracy: state.correct / state.keystrokes,
    errors: state.keystrokes - state.correct,
    timeMs,
  };
}
