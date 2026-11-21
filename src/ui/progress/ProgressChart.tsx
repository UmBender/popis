import type { ReactNode } from "react";
import type { GoalLine, PowerLawFit, RoundPoint } from "../../stats/learning";

export type ProgressChartProps = {
  readonly title: string;
  readonly unit: string;
  readonly rounds: readonly RoundPoint[];
  readonly fit: PowerLawFit | null;
  readonly goal: GoalLine | null;
};

export function ProgressChart(_props: ProgressChartProps): ReactNode {
  throw new Error("todo");
}
