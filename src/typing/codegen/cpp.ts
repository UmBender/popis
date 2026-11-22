import type { CodegenProfile, GeneratedSnippet } from "./types";

export const CPP_RULE_NAMES = [
  "for-loop",
  "cin-read",
  "vector-sized",
  "prefix-sum",
  "sort-lambda",
  "lower-bound",
  "pair-struct",
  "binary-search",
  "constants",
  "structured-binding",
] as const;

export function generateCpp(_seed: number, _profile?: CodegenProfile): GeneratedSnippet {
  throw new Error("todo");
}
