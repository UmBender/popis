import type { WaClass } from "../classes";
import { WA_CASE_DEFS } from "./cases";
import { RECORDED_WA_OUTPUTS } from "./outputs";

/** Judge compilation flags shared by the WA hunt cases and oracle (ADR-T41-1). */
export const WA_JUDGE_FLAGS = ["-std=c++20", "-O2"] as const;

export type WaVerdict = "WA" | "TLE" | "RTE";

export type WaCaseDef = {
  readonly id: string;
  readonly class: WaClass;
  readonly title: string;
  readonly statement: string;
  readonly sample_input: string;
  readonly code: string;
  readonly fixed: string;
  readonly line: number;
  readonly breaking_input: string;
  readonly expected_verdict: WaVerdict;
  readonly explanation: string;
};

export type WaRecordedOutput = {
  readonly sample_output: string;
  readonly wrong_output: string;
  readonly expected_output: string;
  readonly verdict: WaVerdict;
};

export type WaCase = WaCaseDef & WaRecordedOutput;

/** All WA hunt cases with outputs verified and recorded by `npm run wa:oracle -- --write`. */
export const WA_CASES: readonly WaCase[] = WA_CASE_DEFS.map((def) => ({
  ...def,
  ...RECORDED_WA_OUTPUTS[def.id]!,
}));

export function casesForClasses(classes: readonly WaClass[]): readonly WaCase[] {
  if (classes.length === 0) return WA_CASES;
  return WA_CASES.filter((c) => classes.includes(c.class));
}
