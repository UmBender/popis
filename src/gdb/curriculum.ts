import type { LessonId } from "../learn/curriculum";
import type { CheckContext } from "./check";
import type { GdbCmdKind, StopState } from "./cmd-drill";
import type { GdbAction } from "./commands";

export type GdbExampleStep = {
  readonly cmd: string;
  readonly note: string;
};

export type GdbLessonExample = {
  readonly programId: string;
  readonly setup?: readonly string[];
  readonly steps: readonly GdbExampleStep[];
};

export type GdbLessonExercise = {
  readonly programId: string;
  readonly stop: StopState;
  readonly prompt: string;
  readonly canonical: string;
  readonly expected: GdbAction;
  readonly context: CheckContext;
};

export type GdbLesson = {
  readonly id: LessonId;
  readonly unitId: string;
  readonly title: string;
  readonly explanation: string;
  readonly helpKeys: readonly string[];
  readonly commands: readonly string[];
  readonly example: GdbLessonExample;
  readonly exercises: readonly [GdbLessonExercise, GdbLessonExercise, GdbLessonExercise];
  readonly practiceKinds: readonly GdbCmdKind[];
};

export type GdbUnit = {
  readonly id: string;
  readonly number: number;
  readonly title: string;
  readonly lessons: readonly GdbLesson[];
};

export const GDB_UNITS: readonly GdbUnit[] = [];

export const GDB_LESSONS: readonly GdbLesson[] = [];

export function gdbLessonById(_id: string): GdbLesson | undefined {
  throw new Error("todo");
}

export function gdbLessonForCommand(_key: string): GdbLesson | undefined {
  throw new Error("todo");
}

export function gdbCommandDescription(_key: string): string | undefined {
  throw new Error("todo");
}
