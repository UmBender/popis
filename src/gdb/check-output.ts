import type { FormatCommandKind } from "./format";

export type OutputCheckKind = FormatCommandKind;

export type OutputCheckMeta = {
  readonly command?: string;
  readonly kind?: OutputCheckKind;
  readonly fallbackReason?: string;
};

export type OutputCheckResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: string };

export function normalizeGdbOutput(_text: string, _allowHistoryPrefix?: boolean): string {
  throw new Error("todo");
}

export function checkOutput(
  _typed: string,
  _expected: string,
  _meta?: OutputCheckMeta,
): OutputCheckResult {
  throw new Error("todo");
}
