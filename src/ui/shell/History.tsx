import type { ReactNode } from "react";
import { sparkline } from "../verdicts";

/** How many past rounds the panel shows. */
const HISTORY_ROUNDS = 10;

/** Standard empty-history invitation across all training screens (T19 AC-5). */
export const EMPTY_HISTORY = "Nenhuma rodada nesta configuração. Enter começa a primeira.";

export type HistoryProps = {
  /** Scores of the rounds played in this configuration, oldest first. */
  readonly scores: readonly number[];
  /** Optional unit shown after best and mean (e.g. "WPM", "alvos", "edições"). */
  readonly unit?: string;
  /** Assisted rounds excluded from best/mean (T21 AC-4). */
  readonly excluded?: number;
  readonly testId?: string;
  readonly sparkTestId?: string;
};

/** Shared "Últimas 10 rodadas" summary with sparkline, best and mean (ADR-T19-1). */
export function RoundHistory({
  scores,
  unit,
  excluded = 0,
  testId,
  sparkTestId,
}: HistoryProps): ReactNode {
  const excludedNote =
    excluded > 0
      ? `(${String(excluded)} ${excluded === 1 ? "rodada assistida fora" : "rodadas assistidas fora"})`
      : null;
  const last = scores.slice(-HISTORY_ROUNDS);
  if (last.length === 0) {
    return (
      <p className="history muted" data-panel="history" data-testid={testId}>
        {EMPTY_HISTORY}
        {excludedNote !== null && (
          <>
            {" "}
            <span data-testid="history-excluded">{excludedNote}</span>
          </>
        )}
      </p>
    );
  }
  const best = Math.round(Math.max(...scores));
  const mean = Math.round(last.reduce((a, b) => a + b, 0) / last.length);
  const suffix = unit === undefined || unit === "" ? "" : ` ${unit}`;
  return (
    <p className="history muted" data-panel="history" data-testid={testId}>
      <span>{`Últimas ${String(HISTORY_ROUNDS)} rodadas`}</span>{" "}
      <span className="spark" data-testid={sparkTestId}>
        {sparkline(last)}
      </span>{" "}
      <span>
        melhor <strong>{best}</strong>
        {suffix}
      </span>{" "}
      <span>
        média <strong>{mean}</strong>
        {suffix}
      </span>
      {excludedNote !== null && (
        <>
          {" "}
          <span data-testid="history-excluded">{excludedNote}</span>
        </>
      )}
    </p>
  );
}
