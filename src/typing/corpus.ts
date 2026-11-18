export type Language = "cpp" | "python";

export const LANGUAGES: readonly Language[] = ["cpp", "python"];

export const LANGUAGE_LABELS: Readonly<Record<Language, string>> = {
  cpp: "C++",
  python: "Python",
};

/** A curated piece of code to type (ADR-T10-1). */
export type Snippet = {
  readonly id: string;
  readonly language: Language;
  readonly text: string;
};

export const CORPUS: readonly Snippet[] = [];

/** A snippet of the given languages, picked with the seeded RNG. */
export function pickSnippet(seed: number, languages: readonly Language[]): Snippet {
  void seed;
  void languages;
  throw new Error("todo");
}
