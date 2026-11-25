/** A language of the reference (ADR-T46-1); T47 adds "python". */
export type Lang = "cpp";

/** One row of a complexity table: the operation and its cost. */
export type ComplexityRow = readonly [operation: string, cost: string];

export type Section = {
  readonly id: string;
  readonly lang: Lang;
  readonly title: string;
};

/** One entry of the reference: what to type, what it costs, what it prints, what bites. */
export type Entry = {
  /** Unique within the language; the hash is `#<lang>/<id>`. */
  readonly id: string;
  readonly lang: Lang;
  readonly section: string;
  readonly title: string;
  /** Shown in a monospaced font. */
  readonly signature: string;
  /** A cost, or a table of costs per operation (containers). */
  readonly complexity?: string | readonly ComplexityRow[];
  /** At most 6 lines; wrapped by the oracle (ADR-T46-1). */
  readonly example: string;
  /** Standard input of the example. */
  readonly input?: string;
  /** Recorded by the oracle, never typed by hand. */
  readonly output: string;
  /** One sentence each. */
  readonly pitfalls: readonly string[];
  readonly tags: readonly string[];
  /** Minimum language version, e.g. "C++17". */
  readonly since?: string;
  /** Does not exist at the ICPC World Finals judge. */
  readonly judge?: true;
  readonly link?: string;
};

/** An entry as written in a section file: the section, language and output are joined later. */
export type EntryDraft = Omit<Entry, "lang" | "section" | "output">;

/** The badge of an entry with `judge`. */
export const JUDGE_BADGE = "não existe na WF";
