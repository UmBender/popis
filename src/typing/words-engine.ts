/** Letters a word accepts beyond its target. */
export const MAX_EXTRA = 10;

/** A text typing test judged word by word (ADR-T12-1); every function returns a new state. */
export type WordsState = {
  readonly words: readonly string[];
  /** What was typed for each word up to the current one. */
  readonly inputs: readonly string[];
  /** Index of the word being typed; `words.length` once space ended the last one. */
  readonly current: number;
  readonly lenient: boolean;
  /** Length of a time test, or null when the test ends with its words. */
  readonly timeLimitMs: number | null;
  readonly startedAt: number | null;
  readonly finishedAt: number | null;
  /** Keys that inserted a character, spaces included. */
  readonly keystrokes: number;
  /** Of those, the ones that were right. */
  readonly correctKeystrokes: number;
};

export type LetterMark = "correct" | "incorrect" | "extra" | "pending";
export type Letter = { readonly char: string; readonly mark: LetterMark };
export type WordStatus = "correct" | "wrong" | "current" | "pending";
export type WordView = { readonly status: WordStatus; readonly letters: readonly Letter[] };

export type WordsStats = {
  readonly wpm: number;
  readonly raw: number;
  readonly accuracy: number;
  readonly correct: number;
  readonly incorrect: number;
  readonly extra: number;
  readonly missed: number;
  readonly timeMs: number;
};

export type WordsOptions = { readonly lenient: boolean; readonly timeLimitMs: number | null };

export function startWords(words: readonly string[], options: WordsOptions): WordsState {
  void words;
  void options;
  throw new Error("todo");
}

export function isWordsFinished(state: WordsState): boolean {
  void state;
  throw new Error("todo");
}

/** Types `text` key by key; a space in it is the space key. */
export function typeWordsText(state: WordsState, text: string, now: number): WordsState {
  void state;
  void text;
  void now;
  throw new Error("todo");
}

/** Moves to the next word, right or wrong; does nothing on an empty word. */
export function pressSpace(state: WordsState, now: number): WordsState {
  void state;
  void now;
  throw new Error("todo");
}

/** Deletes a letter, or goes back to a wrong previous word. */
export function backspaceWord(state: WordsState): WordsState {
  void state;
  throw new Error("todo");
}

/** Deletes the current word (Ctrl+Backspace). */
export function clearWord(state: WordsState): WordsState {
  void state;
  throw new Error("todo");
}

/** Ends a time test whose time is up. */
export function tick(state: WordsState, now: number): WordsState {
  void state;
  void now;
  throw new Error("todo");
}

export function appendWords(state: WordsState, more: readonly string[]): WordsState {
  void state;
  void more;
  throw new Error("todo");
}

/** Marks of the letters of `target` typed as `input`, extra letters included. */
export function wordLetters(target: string, input: string, lenient: boolean): Letter[] {
  void target;
  void input;
  void lenient;
  throw new Error("todo");
}

export function wordView(state: WordsState): WordView[] {
  void state;
  throw new Error("todo");
}

export function wordsStats(state: WordsState): WordsStats {
  void state;
  throw new Error("todo");
}
