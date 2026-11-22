import type { GdbAction } from "./commands";

export type CheckContext = {
  readonly file: string;
  readonly currentFrame: number;
  readonly frameCount: number;
};

export type CheckResult =
  | { readonly ok: true; readonly action: GdbAction }
  | { readonly ok: false; readonly reason: string };

export function checkCommand(
  _input: string,
  _expected: GdbAction,
  _context: CheckContext,
): CheckResult {
  throw new Error("todo");
}
