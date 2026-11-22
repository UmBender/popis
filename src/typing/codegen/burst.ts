import type { Language } from "../corpus";
import type { BurstSnippet, BurstSummary, CodegenProfile } from "./types";

export const BURST_REPETITIONS = 5 as const;

export function generateBurst(
  _seed: number,
  _languages: readonly Language[],
  _profile?: CodegenProfile,
): BurstSnippet {
  throw new Error("todo");
}

export function burstSummary(_timesMs: readonly number[]): BurstSummary {
  throw new Error("todo");
}
