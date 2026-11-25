import { applyReplace, compile, validateReplacement, type MatchSpan } from "./compile";
import type { CasarItem, ExtrairItem, LerItem, TrocarItem } from "./types";

export type CasarLineEval = {
  readonly line: string;
  readonly expected: boolean;
  readonly matched: boolean;
  readonly span: MatchSpan | null;
  readonly ok: boolean;
};

export type CasarEval =
  | { readonly ok: false; readonly error: string }
  | {
      readonly ok: true;
      readonly allPassed: boolean;
      readonly lines: readonly CasarLineEval[];
      readonly passedCount: number;
      readonly totalCount: number;
    };

export type ExtrairCaseEval = {
  readonly line: string;
  readonly expected: string | null;
  readonly actual: string | null;
  readonly span: MatchSpan | null;
  readonly ok: boolean;
};

export type ExtrairEval =
  | { readonly ok: false; readonly error: string }
  | {
      readonly ok: true;
      readonly allPassed: boolean;
      readonly cases: readonly ExtrairCaseEval[];
      readonly passedCount: number;
      readonly totalCount: number;
    };

export type TrocarCaseEval = {
  readonly before: string;
  readonly expected: string;
  readonly actual: string;
  readonly spans: readonly MatchSpan[];
  readonly ok: boolean;
};

export type TrocarEval =
  | { readonly ok: false; readonly error: string; readonly field: "pattern" | "replacement" }
  | {
      readonly ok: true;
      readonly allPassed: boolean;
      readonly cases: readonly TrocarCaseEval[];
      readonly passedCount: number;
      readonly totalCount: number;
    };

export type LerLineEval = {
  readonly line: string;
  readonly expected: boolean;
  readonly selected: boolean;
  readonly span: MatchSpan | null;
  readonly ok: boolean;
};

export type LerEval = {
  readonly ok: true;
  readonly allPassed: boolean;
  readonly lines: readonly LerLineEval[];
  readonly passedCount: number;
  readonly totalCount: number;
};

/** Evaluates a pattern against the positive and negative lists of a `casar` item. */
export function checkCasar(pattern: string, item: CasarItem): CasarEval {
  const compiled = compile(pattern, item.dialect, item.mode);
  if (!compiled.ok) return compiled;

  const lines: CasarLineEval[] = [
    ...item.positive.map((line) => {
      const span = compiled.matcher.exec(line);
      const matched = span !== null;
      return { line, expected: true, matched, span, ok: matched };
    }),
    ...item.negative.map((line) => {
      const span = compiled.matcher.exec(line);
      const matched = span !== null;
      return { line, expected: false, matched, span, ok: !matched };
    }),
  ];

  const passedCount = lines.filter((l) => l.ok).length;
  return {
    ok: true,
    allPassed: passedCount === lines.length,
    lines,
    passedCount,
    totalCount: lines.length,
  };
}

/** Evaluates a pattern against an `extrair` item requiring capture group 1. */
export function checkExtrair(pattern: string, item: ExtrairItem): ExtrairEval {
  const compiled = compile(pattern, item.dialect, item.mode);
  if (!compiled.ok) return compiled;
  if (compiled.matcher.groupCount < 1) {
    return {
      ok: false,
      error: "Use parênteses `(...)` para capturar o trecho no grupo 1",
    };
  }

  const cases: ExtrairCaseEval[] = item.cases.map((c) => {
    const span = compiled.matcher.exec(c.line);
    const actual = span === null ? null : (span.groups[0] ?? null);
    const ok = c.expected === null ? span === null : actual === c.expected;
    return { line: c.line, expected: c.expected, actual, span, ok };
  });

  const passedCount = cases.filter((c) => c.ok).length;
  return {
    ok: true,
    allPassed: passedCount === cases.length,
    cases,
    passedCount,
    totalCount: cases.length,
  };
}

/** Evaluates a pattern and replacement against a `trocar` item. */
export function checkTrocar(pattern: string, replacement: string, item: TrocarItem): TrocarEval {
  const compiled = compile(pattern, item.dialect, item.mode);
  if (!compiled.ok) return { ok: false, error: compiled.error, field: "pattern" };

  const replCheck = validateReplacement(replacement, item.dialect, compiled.matcher.groupCount);
  if (!replCheck.ok) return { ok: false, error: replCheck.error, field: "replacement" };

  const cases: TrocarCaseEval[] = item.cases.map((c) => {
    const spans = compiled.matcher.findAll(c.before);
    const replaced = applyReplace(compiled.matcher, c.before, replacement);
    const actual = replaced.ok ? replaced.output : c.before;
    return { before: c.before, expected: c.after, actual, spans, ok: actual === c.after };
  });

  const passedCount = cases.filter((c) => c.ok).length;
  return {
    ok: true,
    allPassed: passedCount === cases.length,
    cases,
    passedCount,
    totalCount: cases.length,
  };
}

/** Evaluates the user's line checkboxes against a `ler` item. */
export function checkLer(selected: readonly boolean[], item: LerItem): LerEval {
  const compiled = compile(item.pattern, item.dialect, item.mode);
  const matcher = compiled.ok ? compiled.matcher : null;

  const lines: LerLineEval[] = item.lines.map((line, i) => {
    const expected = item.expected[i] ?? false;
    const chosen = selected[i] ?? false;
    const span = matcher === null ? null : matcher.exec(line);
    return { line, expected, selected: chosen, span, ok: chosen === expected };
  });

  const passedCount = lines.filter((l) => l.ok).length;
  return {
    ok: true,
    allPassed: passedCount === lines.length,
    lines,
    passedCount,
    totalCount: lines.length,
  };
}

/** Levenshtein edit distance between two strings. */
export function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const curr = new Array<number>(n + 1).fill(0);
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min((prev[j] ?? 0) + 1, (curr[j - 1] ?? 0) + 1, (prev[j - 1] ?? 0) + cost);
    }
    prev = curr;
  }
  return prev[n] ?? 0;
}
