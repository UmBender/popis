export type StlCheckOptions = {
  readonly boolalpha?: boolean;
};

export type StlCheckResult = {
  readonly ok: boolean;
  readonly reason: string;
};

export function tokenizeOutput(_text: string): string[] {
  throw new Error("todo");
}

export function checkStlAnswer(
  _typed: string,
  _expected: string,
  _opts?: StlCheckOptions,
): StlCheckResult {
  throw new Error("todo");
}
