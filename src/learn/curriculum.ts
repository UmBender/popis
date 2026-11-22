export type LessonId = string;

export type UnitStatus = "new" | "in-progress" | "done";

export type ExerciseStep = 0 | 1 | 2;

export type LessonLike = {
  readonly id: LessonId;
};

export type UnitLike<L extends LessonLike = LessonLike> = {
  readonly lessons: readonly L[];
};

export function unitStatus<L extends LessonLike>(
  _unit: UnitLike<L>,
  _completed: ReadonlySet<string>,
): UnitStatus {
  throw new Error("todo");
}

export function nextUncompleted<L extends LessonLike>(
  _lessons: readonly L[],
  _completed: ReadonlySet<string>,
): L | null {
  throw new Error("todo");
}

export function nextFadingStep(_step: ExerciseStep, _firstTry: boolean): ExerciseStep | "done" {
  throw new Error("todo");
}
