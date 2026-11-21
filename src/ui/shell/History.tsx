import type { ReactNode } from "react";
import type { Plateau } from "../../stats/learning";
import { formatSignedRate } from "../../stats/progress";
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
  /** Weekly improvement slope over the last 4 weeks (T23 AC-5). */
  readonly weeklyRate?: number | null;
  /** Plateau info when the last 10 rounds are non-improving (T23 AC-5). */
  readonly plateau?: Plateau | null;
  /** Jump to this item's section in Evolução (T23 AC-5). */
  readonly onProgress?: () => void;
  readonly testId?: string;
  readonly sparkTestId?: string;
};

/** Shared "Últimas 10 rodadas" summary with sparkline, best, mean, weekly rate and plateau (ADR-T19-1, T23 AC-5). */
export function RoundHistory({
  scores,
  unit,
  excluded = 0,
  weeklyRate = null,
  plateau = null,
  onProgress,
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
      {weeklyRate !== null && (
        <>
          {" "}
          <span data-testid="history-rate">{`${formatSignedRate(weeklyRate)}/sem`}</span>
        </>
      )}
      {plateau !== null && (
        <>
          {" "}
          <span className="progress-plateau" data-testid="history-plateau">
            platô
          </span>
        </>
      )}
      {onProgress !== undefined && (
        <>
          {" "}
          <button type="button" className="history-link" onClick={onProgress}>
            Evolução
          </button>
        </>
      )}
      {excludedNote !== null && (
        <>
          {" "}
          <span data-testid="history-excluded">{excludedNote}</span>
        </>
      )}
    </p>
  );
}
