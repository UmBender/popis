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
export function Result({
  headline,
  headlineTestId,
  pairs,
  pairsTestId,
  extra,
  worst,
  seed,
  seedTestId,
  onPlayAgain,
  actions,
}: ResultProps): ReactNode {
  return (
    <div className="result typing-results" data-testid="result">
      <p className="solved" data-testid={headlineTestId}>
        {headline}
      </p>
      <dl className="pairs" data-testid={pairsTestId}>
        {pairs.map((pair) => (
          <div key={pair.label}>
            <dt>{pair.label}</dt>
            <dd data-testid={pair.testId}>{pair.value}</dd>
          </div>
        ))}
      </dl>
      {extra}
      {worst}
      <p className="seed" data-testid={seedTestId}>
        {seed}
      </p>
      <div className="actions">
        <button
          type="button"
          className="primary start"
          aria-label="Jogar de novo"
          autoFocus
          onClick={onPlayAgain}
        >
          Jogar de novo <kbd>Enter</kbd>
        </button>
        {actions}
      </div>
    </div>
  );
}
