export const SITES = ["codeforces", "atcoder", "codechef", "leetcode"] as const;

export type Site = (typeof SITES)[number];

export const SITE_LABEL: Readonly<Record<Site, string>> = {
  codeforces: "Codeforces",
  atcoder: "AtCoder",
  codechef: "CodeChef",
  leetcode: "LeetCode",
};

export type Contest = {
  readonly site: Site;
  readonly id: string;
  readonly name: string;
  readonly url: string;
  /** Start time in Unix epoch milliseconds. */
  readonly startMs: number;
  /** Contest length in milliseconds. */
  readonly durationMs: number;
};

export type SourceError = {
  readonly site: Site;
  readonly message: string;
};

export type ContestsSnapshot = {
  /** Snapshot creation time in Unix epoch milliseconds. */
  readonly generatedAt: number;
  readonly contests: readonly Contest[];
  readonly errors: readonly SourceError[];
};

export function isSite(_value: unknown): _value is Site {
  throw new Error("todo");
}

export function isContest(_value: unknown): _value is Contest {
  throw new Error("todo");
}

export function parseSnapshot(_value: unknown): ContestsSnapshot | null {
  throw new Error("todo");
}
