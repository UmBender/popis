import type { Language } from "../corpus";
import type { CodegenProfile, GeneratedSnippet } from "./types";

export { BURST_REPETITIONS, burstSummary, generateBurst } from "./burst";
export { CPP_RULE_NAMES } from "./cpp";
export { DEFAULT_PROFILE } from "./profile";
export { PYTHON_RULE_NAMES } from "./python";
export type {
  BurstSnippet,
  BurstSummary,
  CodegenProfile,
  CountEntry,
  GeneratedSnippet,
} from "./types";

export function generateCode(
  _seed: number,
  _language: Language,
  _profile?: CodegenProfile,
): GeneratedSnippet {
  throw new Error("todo");
}

export function generateCodeSnippet(
  _seed: number,
  _languages: readonly Language[],
  _profile?: CodegenProfile,
): GeneratedSnippet {
  throw new Error("todo");
}
