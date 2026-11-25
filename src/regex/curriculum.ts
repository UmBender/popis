import type { LessonLike, UnitLike } from "../learn/curriculum";
import type { MatchMode, RegexDialect } from "./compile";
import type { RegexItem, RegexItemKind } from "./types";

export type RegexToken = {
  readonly syntax: string;
  readonly desc: string;
};

export type RegexExampleStep = {
  readonly pattern: string;
  readonly replacement?: string;
  readonly note: string;
};

export type RegexExample = {
  readonly dialect: RegexDialect;
  readonly mode: MatchMode;
  readonly lines: readonly string[];
  readonly steps: readonly RegexExampleStep[];
};

export type RegexLesson = LessonLike & {
  readonly id: string;
  readonly title: string;
  readonly explanation: string;
  readonly dialect: RegexDialect;
  readonly tokens: readonly RegexToken[];
  readonly example: RegexExample;
  readonly exercises: readonly [RegexItem, RegexItem, RegexItem];
  readonly practiceKinds: readonly RegexItemKind[];
  readonly practiceDialect: RegexDialect;
};

export type RegexUnit = UnitLike<RegexLesson> & {
  readonly id: string;
  readonly number: number;
  readonly title: string;
  readonly lessons: readonly RegexLesson[];
};

export const REGEX_UNITS: readonly RegexUnit[] = [];

export const REGEX_LESSONS: readonly RegexLesson[] = [];

export function regexLessonById(_id: string): RegexLesson | undefined {
  throw new Error("todo");
}

export function regexLessonForToken(_syntax: string): RegexLesson | undefined {
  throw new Error("todo");
}
