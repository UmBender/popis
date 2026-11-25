export type RegexDialect = "python" | "ere";

export const REGEX_DIALECTS: readonly RegexDialect[] = ["python", "ere"];

export const REGEX_DIALECT_LABELS: Readonly<Record<RegexDialect, string>> = {
  python: "Python re",
  ere: "grep -E",
};

export type MatchMode = "search" | "fullmatch";

export type MatchSpan = {
  readonly start: number;
  readonly end: number;
  readonly text: string;
  /** Capture groups 1..N (0-indexed: groups[0] is group 1). */
  readonly groups: readonly (string | undefined)[];
};

export type CompiledRegex = {
  readonly pattern: string;
  readonly dialect: RegexDialect;
  readonly mode: MatchMode;
  readonly jsSource: string;
  readonly groupCount: number;
  exec(line: string): MatchSpan | null;
  test(line: string): boolean;
  findAll(line: string): readonly MatchSpan[];
};

export type CompileResult =
  | { readonly ok: true; readonly matcher: CompiledRegex }
  | { readonly ok: false; readonly error: string };

export type ReplaceResult =
  | { readonly ok: true; readonly output: string }
  | { readonly ok: false; readonly error: string };

export function compile(
  _pattern: string,
  _dialect: RegexDialect,
  _mode: MatchMode = "search",
): CompileResult {
  throw new Error("todo");
}

export function validateReplacement(
  _replacement: string,
  _dialect: RegexDialect,
  _groupCount: number,
): { readonly ok: true } | { readonly ok: false; readonly error: string } {
  throw new Error("todo");
}

export function applyReplace(
  _matcher: CompiledRegex,
  _line: string,
  _replacement: string,
): ReplaceResult {
  throw new Error("todo");
}
