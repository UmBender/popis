import type { Language, ValidationResult } from "./types";

export function detectLanguage(_path: string): Language | null {
  throw new Error("todo");
}

export function stripComments(_code: string, _language: Language): string {
  throw new Error("todo");
}

export function normalizeSnippet(_code: string, _language: Language): string {
  throw new Error("todo");
}

export function validateSnippetRules(_text: string): ValidationResult {
  throw new Error("todo");
}
