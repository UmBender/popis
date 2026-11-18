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
  void target;
  throw new Error("todo");
}

/** Types `text` key by key; a "\n" in it is pressed as Enter. */
export function typeText(state: TypingState, text: string, now: number): TypingState {
  void state;
  void text;
  void now;
  throw new Error("todo");
}

export function pressEnter(state: TypingState, now: number): TypingState {
  void state;
  void now;
  throw new Error("todo");
}

export function backspace(state: TypingState): TypingState {
  void state;
  throw new Error("todo");
}

export function isFinished(state: TypingState): boolean {
  void state;
  throw new Error("todo");
}

/** Mark of every target position. */
export function marks(state: TypingState): Mark[] {
  void state;
  throw new Error("todo");
}

/** Characters the player types: the target without leading indentation. */
export function typeableLength(target: string): number {
  void target;
  throw new Error("todo");
}

export function typingStats(state: TypingState): TypingStats {
  void state;
  throw new Error("todo");
}
