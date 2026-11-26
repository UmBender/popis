export const SITES = ["codeforces", "atcoder", "codechef", "leetcode"] as const;

export type Site = (typeof SITES)[number];

export const SITE_LABEL: Readonly<Record<Site, string>> = {
  codeforces: "Codeforces",
  atcoder: "AtCoder",
  codechef: "CodeChef",
  leetcode: "LeetCode",
};

const SITE_SET: ReadonlySet<string> = new Set(SITES);

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isSite(value: unknown): value is Site {
  return typeof value === "string" && SITE_SET.has(value);
}

export function isContest(value: unknown): value is Contest {
  if (!isRecord(value)) return false;
  return (
    isSite(value["site"]) &&
    typeof value["id"] === "string" &&
    value["id"].length > 0 &&
    typeof value["name"] === "string" &&
    value["name"].length > 0 &&
    typeof value["url"] === "string" &&
    value["url"].length > 0 &&
    typeof value["startMs"] === "number" &&
    Number.isFinite(value["startMs"]) &&
    typeof value["durationMs"] === "number" &&
    Number.isFinite(value["durationMs"]) &&
    value["durationMs"] > 0
  );
}

function isSourceError(value: unknown): value is SourceError {
  if (!isRecord(value)) return false;
  return isSite(value["site"]) && typeof value["message"] === "string";
}

/** Validates a parsed JSON payload against the ContestsSnapshot schema. */
export function parseSnapshot(value: unknown): ContestsSnapshot | null {
  if (!isRecord(value)) return null;
  const { generatedAt, contests, errors } = value;
  if (typeof generatedAt !== "number" || !Number.isFinite(generatedAt)) return null;
  if (!Array.isArray(contests) || !contests.every(isContest)) return null;
  if (!Array.isArray(errors) || !errors.every(isSourceError)) return null;
  return { generatedAt, contests, errors };
}
