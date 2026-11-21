import type { ReactNode } from "react";
import type { PreviewBlock } from "../../vim/preview";

export type OptimalPreviewProps = {
  readonly blocks: readonly PreviewBlock[];
  readonly matchedKeys: number;
  readonly onOpenLesson: (lessonId: string) => void;
};

export function OptimalPreview(_props: OptimalPreviewProps): ReactNode {
  throw new Error("todo");
}

export type LessonModalProps = {
  readonly lessonId: string;
  readonly onClose: () => void;
};

export function LessonModal(_props: LessonModalProps): ReactNode {
  throw new Error("todo");
}
