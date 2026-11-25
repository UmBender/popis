import type { RegexDialect } from "../regex/compile";
import { REGEX_ITEM_KINDS, type RegexItemKind } from "../regex/types";
import type { KeyValueStore } from "./kv";

export const REGEX_KEY = "popis.regex";
export const REGEX_RESULTS_KEY = "popis.regex-results";
export const MAX_REGEX_RESULTS = 200;

export type RegexSettings = {
  readonly dialect: RegexDialect;
  readonly kinds: readonly RegexItemKind[];
};

export const DEFAULT_REGEX_SETTINGS: RegexSettings = {
  dialect: "python",
  kinds: REGEX_ITEM_KINDS,
};

export type RegexRoundResult = {
  readonly version: 1;
  readonly dialect: RegexDialect;
  readonly seed: number;
  readonly correct: number;
  readonly skipped: number;
  readonly attempts: number;
  readonly timeMs: number;
  readonly finishedAt: number;
};

export function parseRegexSettings(_value: unknown): RegexSettings {
  throw new Error("todo");
}

export function loadRegexSettings(_store: KeyValueStore): RegexSettings {
  throw new Error("todo");
}

export function saveRegexSettings(_store: KeyValueStore, _settings: RegexSettings): void {
  throw new Error("todo");
}

export function loadRegexResults(_store: KeyValueStore): RegexRoundResult[] {
  throw new Error("todo");
}

export function appendRegexResult(_store: KeyValueStore, _result: RegexRoundResult): void {
  throw new Error("todo");
}
