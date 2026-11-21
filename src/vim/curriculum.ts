import type { EditKind } from "./drills/edit";
import type { RegisterKind } from "./drills/register-edit";
import type { Frame } from "./lessons";
import type { Level } from "./levels";
import type { Pos } from "./state";

export type LessonId = string;

export type UnitStatus = "new" | "in-progress" | "done";

export type ExerciseStep = 0 | 1 | 2;

export type MotionExample = {
  readonly kind: "motion";
  readonly level: Level;
  readonly lines: readonly string[];
  readonly start: Pos;
  readonly keys: string;
  readonly target: Pos;
};

export type EditExample = {
  readonly kind: "edit";
  readonly lines: readonly string[];
  readonly start: Pos;
  readonly keys: string;
  readonly after: readonly string[];
};

export type MotionExercise = {
  readonly kind: "motion";
  readonly level: Level;
  readonly lines: readonly string[];
  readonly start: Pos;
  readonly target: Pos;
  readonly reference: string;
};

export type EditExercise = {
  readonly kind: "edit";
  readonly lines: readonly string[];
  readonly start: Pos;
  readonly after: readonly string[];
  readonly reference: string;
};

export type LessonExercise = MotionExercise | EditExercise;

export type PracticeLink =
  | { readonly drill: "motion"; readonly level: Level }
  | { readonly drill: "edit"; readonly kinds: readonly EditKind[] };

export type CurriculumLesson = {
  readonly id: LessonId;
  readonly unitId: string;
  readonly title: string;
  readonly explanation: string;
  readonly helpKeys: readonly string[];
  readonly commands: readonly string[];
  readonly example: MotionExample | EditExample;
  readonly exercises: readonly [LessonExercise, LessonExercise, LessonExercise];
  readonly practice: PracticeLink;
  readonly registerKind?: RegisterKind;
};

export type Unit = {
  readonly id: string;
  readonly number: number;
  readonly title: string;
  readonly level?: Level;
  readonly lessons: readonly CurriculumLesson[];
};

export const UNITS: readonly Unit[] = [];

export const ALL_LESSONS: readonly CurriculumLesson[] = [];

export function curriculumLessonById(_id: string): CurriculumLesson | undefined {
  throw new Error("todo");
}

export function lessonForHelpKey(_key: string): CurriculumLesson | undefined {
  throw new Error("todo");
}

export function commandDescription(_key: string): string | undefined {
  throw new Error("todo");
}

export function curriculumExampleFrames(_lesson: CurriculumLesson): readonly Frame[] {
  throw new Error("todo");
}

export function unitStatus(_unit: Unit, _completed: ReadonlySet<string>): UnitStatus {
  throw new Error("todo");
}

export function nextUncompletedLesson(_completed: ReadonlySet<string>): CurriculumLesson | null {
  throw new Error("todo");
}

export function nextExerciseStep(
  _step: ExerciseStep,
  _typedKeys: number,
  _minKeys: number,
): ExerciseStep | "done" {
  throw new Error("todo");
}
