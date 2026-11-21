import type { ReactNode } from "react";

/** One label/value summary pair in a round result (T19 AC-4). */
export type ResultPair = {
  readonly label: string;
  readonly value: ReactNode;
  readonly testId?: string;
};

export type ResultProps = {
  readonly headline: ReactNode;
  readonly headlineTestId?: string;
  readonly pairs: readonly ResultPair[];
  readonly pairsTestId?: string;
  readonly extra?: ReactNode;
  readonly worst?: ReactNode;
  readonly seed: ReactNode;
  readonly seedTestId?: string;
  readonly onPlayAgain: () => void;
  readonly actions?: ReactNode;
};

/** Shared result view for every training screen (ADR-T19-1). */
export function Result(props: ResultProps): ReactNode {
  void props;
  throw new Error("todo");
}
