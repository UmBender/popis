import type { EditTarget } from "./drills/edit";
import type { RegisterKind } from "./drills/register-edit";
import type { Key } from "./keys";
import type { Mode, Pos } from "./state";

/** One lesson of the Learn mode (ADR-T16-1). */
export type Lesson = {
  readonly kind: RegisterKind;
  readonly title: string;
  /** A short explanation in Portuguese. */
  readonly explanation: string;
  /** The commands the lesson introduces, as shown. */
  readonly commands: readonly string[];
  /** The animated example: a small buffer, the keys and the buffer they give. */
  readonly example: {
    readonly lines: readonly string[];
    readonly start: Pos;
    readonly keys: string;
    readonly after: readonly string[];
  };
  /** The guided exercise is `generateEdit(seed, 0, [kind])`. */
  readonly exercise: { readonly seed: number };
};

/** The editor after each key of an example; the first frame has no key. */
export type Frame = {
  readonly key: Key | null;
  readonly lines: readonly string[];
  readonly cursor: Pos;
  readonly mode: Mode;
};

export const LESSONS: readonly Lesson[] = [];

export function lessonFor(_kind: RegisterKind): Lesson {
  throw new Error("todo");
}

export function exerciseFor(_lesson: Lesson): EditTarget {
  throw new Error("todo");
}

/** The frames of the example: the start, then the state after each key. */
export function exampleFrames(_lesson: Lesson): readonly Frame[] {
  throw new Error("todo");
}
