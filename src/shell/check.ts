import type { ShellNode } from "./parse";

export type ShellCommandRef = {
  readonly key: string;
  readonly text: string;
};

export const SHELL_COMMAND_TABLE: readonly ShellCommandRef[] = [];

export type CheckOptions = {
  readonly allowSemicolon?: boolean;
  readonly hint?: string;
};

export type ShellExpected = {
  readonly accepted: readonly string[];
  readonly options?: CheckOptions;
};

export type CheckResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: string };

export function normalizeShell(_node: ShellNode, _options?: CheckOptions): ShellNode {
  throw new Error("todo");
}

export function nodesEqual(_a: ShellNode, _b: ShellNode): boolean {
  throw new Error("todo");
}

export function checkShellCommand(_typed: string, _expected: ShellExpected): CheckResult {
  throw new Error("todo");
}

export function equivalentForms(_canonical: string, _options?: CheckOptions): readonly string[] {
  throw new Error("todo");
}
