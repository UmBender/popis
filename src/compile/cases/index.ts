import type { CauseId, CompileGroup } from "../causes";
import { COMPILE_CASE_DEFS } from "./cases";
import { RECORDED_OUTPUTS } from "./outputs";

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

/** All compiler/sanitizer cases with outputs recorded by `npm run compile:oracle -- --write`. */
export const COMPILE_CASES: readonly CompileCase[] = COMPILE_CASE_DEFS.map((def) => ({
  ...def,
  output: RECORDED_OUTPUTS[def.id]!,
}));

export function casesForGroups(groups: readonly CompileGroup[]): readonly CompileCase[] {
  if (groups.length === 0) return COMPILE_CASES;
  return COMPILE_CASES.filter((c) => groups.includes(c.group));
}
