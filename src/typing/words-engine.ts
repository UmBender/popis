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

/** A letter without its diacritics, for optional accents. */
function bare(ch: string): string {
  return ch.normalize("NFD").replace(/\p{M}/gu, "");
}

/** Whether `typed` matches the target letter; there is none past the word's end. */
function sameLetter(target: string | undefined, typed: string, lenient: boolean): boolean {
  if (target === undefined) return false;
  return target === typed || (lenient && bare(target) === bare(typed));
}

/** Whether `input` spells `target`; inputs are NFC, so letters line up. */
function spells(target: string, input: string, lenient: boolean): boolean {
  return target === input || (lenient && bare(target) === bare(input));
}

/**
 * Word `index`. Callers only ask for the current word of a running test,
 * a word before it or a word of `wordView`, which are all in range.
 */
function wordOf(state: WordsState, index: number): string {
  return state.words[index] as string;
}

function inputAt(state: WordsState, index: number): string {
  return state.inputs[index] ?? "";
}

function withInput(state: WordsState, input: string): WordsState {
  const inputs = [...state.inputs];
  inputs[state.current] = input;
  return { ...state, inputs };
}

function wordIsRight(state: WordsState, index: number): boolean {
  return spells(wordOf(state, index), inputAt(state, index), state.lenient);
}

export function startWords(words: readonly string[], options: WordsOptions): WordsState {
  if (words.length === 0) throw new RangeError("a text needs at least one word");
  return {
    words,
    inputs: [],
    current: 0,
    lenient: options.lenient,
    timeLimitMs: options.timeLimitMs,
    startedAt: null,
    finishedAt: null,
    keystrokes: 0,
    correctKeystrokes: 0,
  };
}

export function isWordsFinished(state: WordsState): boolean {
  return state.finishedAt !== null;
}

function typeLetter(state: WordsState, ch: string, now: number): WordsState {
  const target = [...wordOf(state, state.current)];
  const input = inputAt(state, state.current);
  const typed = [...input].length;
  if (typed >= target.length + MAX_EXTRA) return state;
  const right = sameLetter(target[typed], ch, state.lenient);
  const next: WordsState = {
    ...withInput(state, input + ch),
    startedAt: state.startedAt ?? now,
    keystrokes: state.keystrokes + 1,
    correctKeystrokes: state.correctKeystrokes + (right ? 1 : 0),
  };
  const lastWord = state.current === state.words.length - 1;
  const done = state.timeLimitMs === null && lastWord && wordIsRight(next, state.current);
  return done ? { ...next, finishedAt: now } : next;
}

/** Types `text` key by key; a space in it is the space key. */
export function typeWordsText(state: WordsState, text: string, now: number): WordsState {
  let next = tick(state, now);
  for (const ch of text.normalize("NFC")) {
    if (isWordsFinished(next)) break;
    next = ch === " " ? pressSpace(next, now) : typeLetter(next, ch, now);
  }
  return next;
}

/** Moves to the next word, right or wrong; does nothing on an empty word. */
export function pressSpace(state: WordsState, now: number): WordsState {
  const ticked = tick(state, now);
  if (isWordsFinished(ticked) || inputAt(ticked, ticked.current) === "") return ticked;
  const lastWord = ticked.current === ticked.words.length - 1;
  // A time test generates words ahead; its last word only waits for more.
  if (lastWord && ticked.timeLimitMs !== null) return ticked;
  const right = wordIsRight(ticked, ticked.current);
  return {
    ...ticked,
    current: ticked.current + 1,
    keystrokes: ticked.keystrokes + 1,
    correctKeystrokes: ticked.correctKeystrokes + (right ? 1 : 0),
    finishedAt: lastWord ? now : null,
  };
}

/** Deletes a letter, or goes back to a wrong previous word. */
export function backspaceWord(state: WordsState): WordsState {
  if (isWordsFinished(state)) return state;
  const input = inputAt(state, state.current);
  if (input !== "") return withInput(state, [...input].slice(0, -1).join(""));
  const previous = state.current - 1;
  if (previous < 0 || wordIsRight(state, previous)) return state;
  return { ...state, inputs: state.inputs.slice(0, state.current), current: previous };
}

/** Deletes the current word (Ctrl+Backspace). */
export function clearWord(state: WordsState): WordsState {
  return isWordsFinished(state) ? state : withInput(state, "");
}

/** Ends a time test whose time is up. */
export function tick(state: WordsState, now: number): WordsState {
  if (state.timeLimitMs === null || state.startedAt === null || isWordsFinished(state)) {
    return state;
  }
  const end = state.startedAt + state.timeLimitMs;
  return now >= end ? { ...state, finishedAt: end } : state;
}

export function appendWords(state: WordsState, more: readonly string[]): WordsState {
  return { ...state, words: [...state.words, ...more] };
}

/** Marks of the letters of `target` typed as `input`, extra letters included. */
export function wordLetters(target: string, input: string, lenient: boolean): Letter[] {
  const typed = [...input];
  const letters: Letter[] = [...target].map((ch, k) => {
    const got = typed[k];
    if (got === undefined) return { char: ch, mark: "pending" };
    return { char: ch, mark: sameLetter(ch, got, lenient) ? "correct" : "incorrect" };
  });
  for (const ch of typed.slice(letters.length)) letters.push({ char: ch, mark: "extra" });
  return letters;
}

function statusAt(state: WordsState, index: number): WordStatus {
  if (index > state.current) return "pending";
  if (index === state.current) {
    if (!isWordsFinished(state)) return "current";
    if (inputAt(state, index) === "") return "pending";
  }
  return wordIsRight(state, index) ? "correct" : "wrong";
}

export function wordView(state: WordsState): WordView[] {
  return state.words.map((word, i) => ({
    status: statusAt(state, i),
    letters: wordLetters(word, inputAt(state, i), state.lenient),
  }));
}

export function wordsStats(state: WordsState): WordsStats {
  if (state.startedAt === null || state.finishedAt === null) {
    throw new RangeError("words stats need a finished test");
  }
  const timeMs = state.finishedAt - state.startedAt;
  const perMinute = (chars: number) => (timeMs > 0 ? chars / 5 / (timeMs / 60_000) : 0);
  let correct = 0;
  let incorrect = 0;
  let extra = 0;
  let missed = 0;
  let typedChars = 0;
  let correctWordChars = 0;
  const counted = Math.min(state.current, state.words.length - 1);
  for (let i = 0; i <= counted; i++) {
    const submitted = i < state.current;
    const word = wordOf(state, i);
    const target = [...word];
    const input = inputAt(state, i);
    for (const letter of wordLetters(word, input, state.lenient)) {
      if (letter.mark === "correct") correct++;
      else if (letter.mark === "incorrect") incorrect++;
      else if (letter.mark === "extra") extra++;
    }
    const length = [...input].length;
    if (submitted) missed += Math.max(0, target.length - length);
    const space = submitted ? 1 : 0;
    typedChars += length + space;
    if (wordIsRight(state, i)) correctWordChars += target.length + space;
  }
  return {
    wpm: perMinute(correctWordChars),
    raw: perMinute(typedChars),
    accuracy: state.correctKeystrokes / state.keystrokes,
    correct,
    incorrect,
    extra,
    missed,
    timeMs,
  };
}
