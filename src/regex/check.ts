import type { MatchSpan } from "./compile";
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

export function checkCasar(_pattern: string, _item: CasarItem): CasarEval {
  throw new Error("todo");
}

export function checkExtrair(_pattern: string, _item: ExtrairItem): ExtrairEval {
  throw new Error("todo");
}

export function checkTrocar(
  _pattern: string,
  _replacement: string,
  _item: TrocarItem,
): TrocarEval {
  throw new Error("todo");
}

export function checkLer(_selected: readonly boolean[], _item: LerItem): LerEval {
  throw new Error("todo");
}

export function editDistance(_a: string, _b: string): number {
  throw new Error("todo");
}
