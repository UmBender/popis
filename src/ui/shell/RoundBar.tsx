import type { ReactNode } from "react";

/** One label/value metric shown in the round bar (T19 AC-3). */
export type RoundMetric = {
  readonly label: string;
  readonly value: ReactNode;
  readonly testId?: string;
  readonly ariaLabel?: string;
  readonly tone?: "accent" | "warning";
};

export type RoundBarProps = {
  readonly metrics: readonly RoundMetric[];
};

/** Shared time/progress and score bar for every training screen (ADR-T19-1). */
export function RoundBar(props: RoundBarProps): ReactNode {
  void props;
  throw new Error("todo");
}
