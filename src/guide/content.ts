import type { LessonId } from "../learn/curriculum";
import type { ItemId } from "../ui/shell/sections";

export type GuideLearnItem = "vim-learn" | "gdb-learn" | "shell-learn" | "regex-learn";

export type GuideLink =
  | { readonly kind: "item"; readonly item: ItemId; readonly label: string }
  | {
      readonly kind: "lesson";
      readonly item: GuideLearnItem;
      readonly lesson: LessonId;
      readonly label: string;
    };

export type GuideItem = {
  readonly id: string;
  readonly text: string;
  readonly link?: GuideLink;
};

export type GuideSection = {
  readonly id: string;
  readonly title: string;
  readonly items: readonly GuideItem[];
};

export const GUIDE_SECTIONS: readonly GuideSection[] = [];

export const GUIDE_ITEMS: readonly GuideItem[] = [];

export function isGuideItemId(_value: unknown): _value is string {
  throw new Error("todo");
}
