/** One post-3.9 stdlib API that `ast.parse(..., feature_version=(3, 9))` does not reject (ADR-T47-1). */
export type Post39Api = {
  readonly name: string;
  readonly since: string;
  readonly pattern: RegExp;
};

/** Hand-maintained list of post-3.9 stdlib APIs used by the Python oracle and content tests. */
export const POST_39_APIS: readonly Post39Api[] = [];

/** Whether a `since` label (e.g. "Python 3.10") is newer than Python 3.9. */
export function isAfter39(_since: string | undefined): boolean {
  throw new Error("todo");
}

/** Lists every post-3.9 stdlib API matched in a Python example (ignoring comments). */
export function findPost39Apis(_source: string): readonly Post39Api[] {
  throw new Error("todo");
}
