import type { CodegenProfile, GeneratedSnippet } from "./types";

export const PYTHON_RULE_NAMES = [
  "py-for-range",
  "py-input-split",
  "py-list-comp",
  "py-defaultdict",
  "py-sorted-key",
  "py-bisect",
  "py-heapq",
] as const;

export function generatePython(_seed: number, _profile?: CodegenProfile): GeneratedSnippet {
  throw new Error("todo");
}
