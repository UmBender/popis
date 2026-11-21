import type { ReactNode } from "react";

/** Standard empty-history invitation across all training screens (T19 AC-5). */
export const EMPTY_HISTORY = "Nenhuma rodada nesta configuração. Enter começa a primeira.";

export type HistoryProps = {
  /** Scores of the rounds played in this configuration, oldest first. */
  readonly scores: readonly number[];
  /** Optional unit shown after best and mean (e.g. "WPM", "alvos", "edições"). */
  readonly unit?: string;
  readonly testId?: string;
  readonly sparkTestId?: string;
};

/** Shared "Últimas 10 rodadas" summary with sparkline, best and mean (ADR-T19-1). */
export function RoundHistory(props: HistoryProps): ReactNode {
  void props;
  throw new Error("todo");
}
