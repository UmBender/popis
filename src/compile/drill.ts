import type { CompileCase } from "./cases";
import type { CauseId, CompileGroup } from "./causes";

export type CompileChoice = {
  readonly id: CauseId;
  readonly label: string;
};

export type CompileItem = {
  readonly index: number;
  readonly seed: number;
  readonly caseData: CompileCase;
  readonly group: CompileGroup;
  readonly kc: `compile.${CompileGroup}`;
  readonly choices: readonly [CompileChoice, CompileChoice, CompileChoice, CompileChoice];
  readonly correctChoiceIndex: 1 | 2 | 3 | 4;
};

export type CompileAnswer = {
  readonly line: number;
  readonly cause: CauseId;
};

export type CompileCheckResult = {
  readonly ok: boolean;
  readonly lineOk: boolean;
  readonly causeOk: boolean;
};

export function generateCompileItem(
  _seed: number,
  _index: number,
  _groups: readonly CompileGroup[],
): CompileItem {
  throw new Error("todo");
}

export function checkCompileAnswer(_item: CompileItem, _answer: CompileAnswer): CompileCheckResult {
  throw new Error("todo");
}
