import type { LessonId } from "../learn/curriculum";
import type { ShellExpected } from "./check";
import type { ShellDrillKind } from "./drill";

export type ShellExampleStep = {
  readonly cmd: string;
  readonly note: string;
};

export type ShellLessonExample = {
  readonly fixture: string;
  readonly setup?: readonly string[];
  readonly steps: readonly ShellExampleStep[];
};

export type ShellLessonExercise = {
  readonly cwd: string;
  readonly files: readonly string[];
  readonly terminalLines: readonly string[];
  readonly prompt: string;
  readonly canonical: string;
  readonly expected: ShellExpected;
};

export type ShellLesson = {
  readonly id: LessonId;
  readonly unitId: string;
  readonly title: string;
  readonly explanation: string;
  readonly note?: string;
  readonly helpKeys: readonly string[];
  readonly commands: readonly string[];
  readonly example: ShellLessonExample;
  readonly exercises: readonly [ShellLessonExercise, ShellLessonExercise, ShellLessonExercise];
  readonly unlocksKind?: ShellDrillKind;
  readonly practiceKinds: readonly ShellDrillKind[];
};

export type ShellUnit = {
  readonly id: string;
  readonly number: number;
  readonly title: string;
  readonly lessons: readonly ShellLesson[];
};

export const SHELL_UNITS: readonly ShellUnit[] = [];

export const SHELL_LESSONS: readonly ShellLesson[] = [];

export function shellLessonById(_id: string): ShellLesson | undefined {
  throw new Error("todo");
}

export function shellLessonForCommand(_command: string): ShellLesson | undefined {
  throw new Error("todo");
}

export function shellCommandDescription(_command: string): string | undefined {
  throw new Error("todo");
}
