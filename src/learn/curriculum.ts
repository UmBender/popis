export type LessonId = string;

export type UnitStatus = "new" | "in-progress" | "done";

export type ExerciseStep = 0 | 1 | 2;

export type LessonLike = {
  readonly id: LessonId;
};

export type UnitLike<L extends LessonLike = LessonLike> = {
  readonly lessons: readonly L[];
};

/** Status of a curriculum unit given the set of completed lesson ids (ADR-T20-1, ADR-T25-1). */
export function unitStatus<L extends LessonLike>(
  unit: UnitLike<L>,
  completed: ReadonlySet<string>,
): UnitStatus {
  const doneCount = unit.lessons.filter((l) => completed.has(l.id)).length;
  if (doneCount === 0) return "new";
  if (doneCount === unit.lessons.length) return "done";
  return "in-progress";
}

/** First lesson in curriculum order that is not completed yet, or null when all are done. */
export function nextUncompleted<L extends LessonLike>(
  lessons: readonly L[],
  completed: ReadonlySet<string>,
): L | null {
  return lessons.find((lesson) => !completed.has(lesson.id)) ?? null;
}

/**
 * Adaptive fading (ADR-T20-1): succeeding cleanly on exercise 1 or 2 skips the
 * next help level; finishing exercise 3 always completes the lesson.
 */
export function nextFadingStep(step: ExerciseStep, firstTry: boolean): ExerciseStep | "done" {
  if (step === 2) return "done";
  if (step === 0) return firstTry ? 2 : 1;
  return firstTry ? "done" : 2;
}
