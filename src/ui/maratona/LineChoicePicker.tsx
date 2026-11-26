import { useMemo, type ReactNode } from "react";

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

const DEFAULT_CODE_ARIA = "Código C++ (clique ou use setas e Enter para escolher a linha)";

/** Shared numbered C++ line picker extracted from T40 CompileScreen (ADR-T41-1). */
export function CodeLinePicker({
  code,
  selectedLine,
  focusedLine,
  correctLine = null,
  wrongLine = null,
  disabled,
  onPickLine,
  testId,
  ariaLabel = DEFAULT_CODE_ARIA,
}: CodeLinePickerProps): ReactNode {
  const lines = useMemo(() => code.split("\n"), [code]);

  return (
    <div
      className="compile-code"
      data-testid={testId}
      data-autofocus="true"
      tabIndex={0}
      role="group"
      aria-label={ariaLabel}
    >
      {lines.map((text, idx) => {
        const lineNo = idx + 1;
        const isCorrect = disabled && correctLine === lineNo;
        const isWrong = disabled && wrongLine === lineNo && correctLine !== lineNo;
        const isSelected = !disabled && selectedLine === lineNo;
        const isFocused = !disabled && focusedLine === lineNo;
        const cls = [
          "compile-line",
          isCorrect ? "compile-line-correct" : "",
          isWrong ? "compile-line-wrong" : "",
          isSelected ? "compile-line-selected" : "",
          isFocused && !isSelected ? "compile-line-focused" : "",
        ]
          .filter(Boolean)
          .join(" ");
        return (
          <button
            key={lineNo}
            type="button"
            className={cls}
            aria-label={`Linha ${String(lineNo)}`}
            aria-pressed={isSelected}
            disabled={disabled}
            data-line={lineNo}
            data-selected={isSelected ? "true" : undefined}
            data-focused={isFocused ? "true" : undefined}
            data-correct={isCorrect ? "true" : undefined}
            data-wrong={isWrong ? "true" : undefined}
            onClick={() => {
              onPickLine(lineNo);
            }}
          >
            <span className="compile-gutter" aria-hidden="true">
              {String(lineNo).padStart(2, " ")}
            </span>
            <span className="compile-line-text">{text}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Shared 1-4 choice button grid extracted from T40 CompileScreen (ADR-T41-1). */
export function ChoiceGrid<T extends string>({
  choices,
  selectedId,
  correctId = null,
  wrongId = null,
  disabled,
  onPick,
  testId,
  ariaLabel,
  itemAttrName = "data-cause",
}: ChoiceGridProps<T>): ReactNode {
  return (
    <div className="compile-choices" data-testid={testId} role="group" aria-label={ariaLabel}>
      {choices.map((choice, idx) => {
        const isCorrect = disabled && correctId === choice.id;
        const isWrong = disabled && wrongId === choice.id && correctId !== choice.id;
        const isSelected = !disabled && selectedId === choice.id;
        const cls = [
          "compile-choice",
          isCorrect ? "compile-choice-correct" : "",
          isWrong ? "compile-choice-wrong" : "",
          isSelected ? "compile-choice-selected" : "",
        ]
          .filter(Boolean)
          .join(" ");
        const attr = { [itemAttrName]: choice.id };
        return (
          <button
            key={choice.id}
            type="button"
            className={cls}
            disabled={disabled}
            aria-pressed={isSelected}
            {...attr}
            data-shortcut={idx + 1}
            data-correct={isCorrect ? "true" : undefined}
            data-wrong={isWrong ? "true" : undefined}
            onClick={() => {
              onPick(choice.id);
            }}
          >
            <kbd>{idx + 1}</kbd> <span>{choice.label}</span>
          </button>
        );
      })}
    </div>
  );
}
