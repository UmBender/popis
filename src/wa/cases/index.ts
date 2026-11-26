import type { WaClass } from "../classes";

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

export const WA_CASES: readonly WaCase[] = [];

export function casesForClasses(_classes: readonly WaClass[]): readonly WaCase[] {
  throw new Error("todo");
}
