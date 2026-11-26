import type { ReactNode } from "react";

export type CodeLinePickerProps = {
  readonly code: string;
  readonly selectedLine: number | null;
  readonly focusedLine: number;
  readonly correctLine?: number | null;
  readonly wrongLine?: number | null;
  readonly disabled: boolean;
  readonly onPickLine: (lineNo: number) => void;
  readonly testId?: string;
  readonly ariaLabel?: string;
};

export type ChoiceOption<T extends string> = {
  readonly id: T;
  readonly label: string;
};

export type ChoiceGridProps<T extends string> = {
  readonly choices: readonly ChoiceOption<T>[];
  readonly selectedId: T | null;
  readonly correctId?: T | null;
  readonly wrongId?: T | null;
  readonly disabled: boolean;
  readonly onPick: (id: T) => void;
  readonly testId?: string;
  readonly ariaLabel: string;
  readonly itemAttrName?: "data-cause" | "data-class";
};

export function CodeLinePicker(_props: CodeLinePickerProps): ReactNode {
  throw new Error("todo");
}

export function ChoiceGrid<T extends string>(_props: ChoiceGridProps<T>): ReactNode {
  throw new Error("todo");
}
