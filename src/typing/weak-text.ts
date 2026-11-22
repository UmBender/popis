/** Tokens generated per line of weak-spot practice (ADR-T30-1). */
export const WEAK_WORDS_PER_LINE = 6;
/** Minimum occurrences of the focused n-gram in every generated line. */
export const MIN_OCCURRENCES_PER_LINE = 2;

export function countOccurrences(_text: string, _needle: string): number {
  throw new Error("todo");
}

export function generateWeakLine(_ngram: string, _seed: number): string {
  throw new Error("todo");
}

export function generateWeakLines(_ngram: string, _seed: number, _lineCount: number): string[] {
  throw new Error("todo");
}

export function weakWordsFrom(
  _ngram: string,
  _seed: number,
  _startLine: number,
  _lineCount: number,
): string[] {
  throw new Error("todo");
}
