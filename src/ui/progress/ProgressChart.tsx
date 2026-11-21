import type { ReactNode } from "react";
import { parseDay, type GoalLine, type PowerLawFit, type RoundPoint } from "../../stats/learning";
import { dayOf } from "../../stats/summary";

export type ProgressChartProps = {
  readonly title: string;
  readonly unit: string;
  readonly rounds: readonly RoundPoint[];
  readonly fit: PowerLawFit | null;
  readonly goal: GoalLine | null;
};

const W = 600;
const H = 220;
const PAD_L = 44;
const PAD_R = 16;
const PAD_T = 16;
const PAD_B = 30;
const PLOT_W = W - PAD_L - PAD_R;
const PLOT_H = H - PAD_T - PAD_B;

/** Formats UTC `YYYY-MM-DD` as `DD/MM`. */
function shortDate(ms: number): string {
  const iso = dayOf(ms);
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

/** Formats UTC `YYYY-MM-DD` as `DD/MM/AAAA`. */
export function fullDate(ms: number): string {
  const iso = dayOf(ms);
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

/** Hand-written SVG progress chart using theme CSS tokens (AC-3, AC-4, AC-6). */
export function ProgressChart({
  title,
  unit,
  rounds,
  fit,
  goal,
}: ProgressChartProps): ReactNode {
  if (rounds.length === 0) return null;

  const goalEnd = goal !== null ? parseDay(goal.deadline) : null;
  const validGoal = goal !== null && goalEnd !== null && goalEnd > goal.setAt ? { ...goal, end: goalEnd } : null;

  const xs = rounds.map((r) => r.at);
  if (validGoal !== null) xs.push(validGoal.setAt, validGoal.end);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const spanX = Math.max(maxX - minX, 1);

  const ys = rounds.map((r) => r.score);
  if (fit !== null) ys.push(fit.a);
  if (validGoal !== null) ys.push(validGoal.baseline, validGoal.target);
  const rawMinY = Math.min(...ys);
  const rawMaxY = Math.max(...ys);
  const padY = Math.max((rawMaxY - rawMinY) * 0.1, 2);
  const minY = Math.max(0, Math.floor(rawMinY - padY));
  const maxY = Math.ceil(rawMaxY + padY);
  const spanY = Math.max(maxY - minY, 1);

  const px = (t: number) =>
    maxX === minX ? PAD_L + PLOT_W / 2 : PAD_L + ((t - minX) / spanX) * PLOT_W;
  const py = (v: number) => PAD_T + PLOT_H - ((v - minY) / spanY) * PLOT_H;

  const unassisted = rounds.filter((r) => r.assisted !== true);
  const curvePath =
    fit !== null && unassisted.length > 0
      ? unassisted
          .map((r, i) => `${i === 0 ? "M" : "L"}${px(r.at).toFixed(1)},${py(fit.predict(i + 1)).toFixed(1)}`)
          .join(" ")
      : null;

  const xTicks =
    maxX === minX
      ? [minX]
      : [minX, minX + spanX * 0.33, minX + spanX * 0.67, maxX];
  const yTicks = [minY, Math.round((minY + maxY) / 2), maxY];
  const hasAssisted = rounds.some((r) => r.assisted === true);

  return (
    <div className="progress-chart-wrap">
      <svg
        className="progress-chart"
        viewBox={`0 0 ${String(W)} ${String(H)}`}
        role="img"
        aria-label={`Gráfico de evolução: ${title} (${unit})`}
      >
        {yTicks.map((v) => {
          const y = py(v);
          return (
            <g key={v}>
              <line
                x1={PAD_L}
                y1={y}
                x2={W - PAD_R}
                y2={y}
                stroke="var(--selection)"
                strokeWidth={1}
              />
              <text
                x={PAD_L - 6}
                y={y + 4}
                textAnchor="end"
                fontSize={10}
                fill="var(--muted)"
              >
                {v}
              </text>
            </g>
          );
        })}

        {xTicks.map((t, idx) => (
          <text
            key={idx}
            x={px(t)}
            y={H - 8}
            textAnchor={idx === 0 ? "start" : idx === xTicks.length - 1 ? "end" : "middle"}
            fontSize={10}
            fill="var(--muted)"
          >
            {shortDate(t)}
          </text>
        ))}

        {fit !== null && (
          <line
            data-series="asymptote"
            x1={PAD_L}
            y1={py(fit.a)}
            x2={W - PAD_R}
            y2={py(fit.a)}
            stroke="var(--accent)"
            strokeWidth={1}
            strokeDasharray="3 4"
            opacity={0.7}
          />
        )}

        {validGoal !== null && (
          <line
            data-series="goal"
            x1={px(validGoal.setAt)}
            y1={py(validGoal.baseline)}
            x2={px(validGoal.end)}
            y2={py(validGoal.target)}
            stroke="var(--warning)"
            strokeWidth={2}
            strokeDasharray="6 4"
          />
        )}

        {curvePath !== null && (
          <path
            data-series="curve"
            d={curvePath}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={2}
          />
        )}

        {rounds.map((r, idx) => {
          const cx = px(r.at);
          const cy = py(r.score);
          if (r.assisted === true) {
            const d = 4.5;
            const pts = `${cx.toFixed(1)},${(cy - d).toFixed(1)} ${(cx + d).toFixed(1)},${cy.toFixed(1)} ${cx.toFixed(1)},${(cy + d).toFixed(1)} ${(cx - d).toFixed(1)},${cy.toFixed(1)}`;
            return (
              <polygon
                key={idx}
                data-point="assisted"
                points={pts}
                fill="var(--bg)"
                stroke="var(--muted)"
                strokeWidth={1.5}
              />
            );
          }
          return (
            <circle
              key={idx}
              data-point="round"
              cx={cx}
              cy={cy}
              r={3.5}
              fill="var(--muted)"
            />
          );
        })}
      </svg>

      {hasAssisted && (
        <p className="muted progress-legend">
          Pontos preenchidos entram na curva; losangos são rodadas assistidas (fora do ajuste).
        </p>
      )}

      <details className="progress-table-details">
        <summary>Ver como tabela</summary>
        <table className="progress-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>{unit}</th>
              {hasAssisted && <th>Modo</th>}
            </tr>
          </thead>
          <tbody>
            {rounds.map((r, idx) => (
              <tr key={idx}>
                <td data-label="Data">{fullDate(r.at)}</td>
                <td data-label={unit}>{r.score.toFixed(1).replace(".", ",")}</td>
                {hasAssisted && (
                  <td data-label="Modo">{r.assisted === true ? "Assistida" : "Normal"}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
