import type { CauseId, CompileGroup } from "../causes";

export type CompileLimits = {
  /** Wall-clock limit passed to `timeout` (seconds) for TLE verdict cases. */
  readonly timeS?: number;
  /** Virtual memory limit passed to `ulimit -v` (KiB) for MLE verdict cases. */
  readonly memoryKb?: number;
};

export type CompileCase = {
  readonly id: string;
  readonly group: CompileGroup;
  readonly code: string;
  readonly flags: readonly string[];
  readonly input?: string;
  readonly limits?: CompileLimits;
  readonly output: string;
  readonly line: number;
  readonly cause: CauseId;
  readonly explanation: string;
};

export const COMPILE_CASES: readonly CompileCase[] = [];

export function casesForGroups(_groups: readonly CompileGroup[]): readonly CompileCase[] {
  throw new Error("todo");
}
