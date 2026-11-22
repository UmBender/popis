import { createRng } from "../../core/rng";
import type { Language } from "../corpus";
import { generateCpp } from "./cpp";
import { DEFAULT_PROFILE } from "./profile";
import { generatePython } from "./python";
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

/** Generates a deterministic code snippet in `language` from `seed` (ADR-T31-1). */
export function generateCode(
  seed: number,
  language: Language,
  profile: CodegenProfile = DEFAULT_PROFILE,
): GeneratedSnippet {
  return language === "cpp" ? generateCpp(seed, profile) : generatePython(seed, profile);
}

/** Picks one language from `languages` by `seed` and generates its code snippet. */
export function generateCodeSnippet(
  seed: number,
  languages: readonly Language[],
  profile: CodegenProfile = DEFAULT_PROFILE,
): GeneratedSnippet {
  if (languages.length === 0) throw new RangeError("choose at least one language");
  const language = createRng(seed).pick(languages);
  return generateCode(seed, language, profile);
}
