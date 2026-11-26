/** One post-3.9 stdlib API that `ast.parse(..., feature_version=(3, 9))` does not reject (ADR-T47-1). */
export type Post39Api = {
  readonly name: string;
  readonly since: string;
  readonly pattern: RegExp;
};

/** Hand-maintained list of post-3.9 stdlib APIs used by the Python oracle and content tests. */
export const POST_39_APIS: readonly Post39Api[] = [
  { name: "itertools.pairwise", since: "Python 3.10", pattern: /\bpairwise\b/ },
  {
    name: "bisect key=",
    since: "Python 3.10",
    pattern: /\b(?:bisect|bisect_left|bisect_right|insort|insort_left|insort_right)\([^)]*\bkey\s*=/,
  },
  { name: "int.bit_count", since: "Python 3.10", pattern: /\.bit_count\s*\(/ },
  { name: "zip strict=", since: "Python 3.10", pattern: /\bzip\([^)]*\bstrict\s*=/ },
  { name: "itertools.batched", since: "Python 3.12", pattern: /\bbatched\b/ },
  { name: "math.cbrt", since: "Python 3.11", pattern: /\bcbrt\s*\(/ },
  { name: "math.sumprod", since: "Python 3.12", pattern: /\bsumprod\s*\(/ },
  { name: "tomllib", since: "Python 3.11", pattern: /\btomllib\b/ },
];

const PY_VERSION = /^Python\s+(\d+)\.(\d+)$/;

/** Whether a `since` label (e.g. "Python 3.10") is newer than Python 3.9. */
export function isAfter39(since: string | undefined): boolean {
  if (since === undefined) return false;
  const match = PY_VERSION.exec(since);
  if (match === null) return false;
  return Number(match[1]) * 100 + Number(match[2]) > 309;
}

/** Strips `# ...` line comments so comments mentioning an API do not trigger hits. */
function stripComments(source: string): string {
  return source
    .split("\n")
    .map((line) => line.replace(/#.*$/, ""))
    .join("\n");
}

/** Lists every post-3.9 stdlib API matched in a Python example (ignoring comments). */
export function findPost39Apis(source: string): readonly Post39Api[] {
  const code = stripComments(source);
  return POST_39_APIS.filter((api) => api.pattern.test(code));
}
