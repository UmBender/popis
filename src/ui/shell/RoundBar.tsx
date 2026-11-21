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
export function RoundBar({ metrics }: RoundBarProps): ReactNode {
  return (
    <div className="round-bar" data-testid="round-bar">
      {metrics.map((m) => (
        <span key={m.label} className="round-metric">
          <span className="round-label">{m.label}</span>{" "}
          <span
            data-testid={m.testId}
            aria-label={m.ariaLabel}
            className={
              m.tone === "warning"
                ? "round-value warning"
                : m.tone === "accent"
                  ? "round-value accent"
                  : "round-value"
            }
          >
            {m.value}
          </span>
        </span>
      ))}
    </div>
  );
}
