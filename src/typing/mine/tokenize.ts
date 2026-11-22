import type { Language } from "./types";

export type TokenKind = "keyword" | "ident" | "number" | "string" | "op";

export interface Token {
  readonly kind: TokenKind;
  readonly text: string;
}

export function tokenize(_code: string, _language: Language): readonly Token[] {
  throw new Error("todo");
}

export function normalizeTokenTexts(_tokens: readonly Token[]): readonly string[] {
  throw new Error("todo");
}

export function formatNormalizedTokens(_tokens: readonly Token[]): string {
  throw new Error("todo");
}
