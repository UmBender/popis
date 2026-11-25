import type { RegexDialect } from "./compile";
import type { RegexItem, RegexItemKind } from "./types";

export const CASAR_FAMILIES: readonly string[] = [];

export function generateRegexItem(
  _seed: number,
  _index: number,
  _dialect: RegexDialect,
  _kinds?: readonly RegexItemKind[],
): RegexItem {
  throw new Error("todo");
}
