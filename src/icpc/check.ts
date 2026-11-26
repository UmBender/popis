import type { IcpcKind } from "./drill";

export type IcpcCheckResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: string };

export function checkIcpcAnswer(
  _kind: IcpcKind,
  _typed: string,
  _canonical: string,
): IcpcCheckResult {
  throw new Error("todo");
}
