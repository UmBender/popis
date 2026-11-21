import type { ReactNode } from "react";
import type { Recommendation } from "../stats/recommend";

type Props = {
  readonly items: readonly Recommendation[];
  readonly testId?: string;
  readonly onLearn?: (lessonId: string) => void;
};

/** Honest training recommendations shown in item panels and Evolução (AC-5). */
export function Recommendations({ items, testId = "recommendations", onLearn }: Props): ReactNode {
  if (items.length === 0) return null;
  return (
    <ul className="recommendations" data-testid={testId} aria-label="Recomendações">
      {items.map((rec) => (
        <li key={`${rec.kind}-${rec.kc ?? rec.drillId}`} className="recommendation-item">
          <span>{rec.message}</span>
          {rec.lessonId !== undefined && onLearn !== undefined && (
            <button
              type="button"
              className="history-link"
              onClick={() => {
                onLearn(rec.lessonId!);
              }}
            >
              Ver lição no Aprender
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
