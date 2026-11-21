import type { Attempt } from "../session/engine";
import { seconds, skillLabel } from "./format";

/** A mark of the submissions queue (docs/architecture/Shell.md). */
export type Verdict = "AC" | "WA" | "SK";

/** One problem in the results scoreboard, in the ICPC convention. */
export type Cell = {
  /** "+", "+n", "?" or "−n". */
  readonly mark: string;
  readonly tone: "ac" | "wa" | "sk";
  /** The time of the problem, or "pulada". */
  readonly note: string;
};

export type ScoreRow = {
  /** The label of the problem type. */
  readonly skill: string;
  readonly cells: readonly Cell[];
};

const wrong = (n: number): Verdict[] => Array.from({ length: n }, () => "WA");

/**
 * The submissions queue: each correction is a WA, then each problem ends in
 * AC or SK; `pending` corrections belong to the problem on screen.
 */
export function verdicts(log: readonly Attempt[], pending: number): Verdict[] {
  const marks: Verdict[] = [];
  for (const attempt of log) {
    if (attempt.outcome === "timeout") continue;
    marks.push(...wrong(attempt.corrections), attempt.outcome === "correct" ? "AC" : "SK");
  }
  return [...marks, ...wrong(pending)];
}

function cell(attempt: Attempt): Cell {
  const n = attempt.corrections;
  if (attempt.outcome === "correct") {
    return { mark: n === 0 ? "+" : `+${String(n)}`, tone: "ac", note: seconds(attempt.timeMs) };
  }
  return n === 0
    ? { mark: "?", tone: "sk", note: "pulada" }
    : { mark: `−${String(n)}`, tone: "wa", note: "pulada" };
}

/** One row per problem type, one cell per problem, in order of appearance. */
export function scoreboard(log: readonly Attempt[]): ScoreRow[] {
  const rows = new Map<string, Cell[]>();
  for (const attempt of log) {
    if (attempt.outcome === "timeout") continue;
    const label = skillLabel(attempt.problem.skill);
    const cells = rows.get(label) ?? [];
    cells.push(cell(attempt));
    rows.set(label, cells);
  }
  return [...rows].map(([skill, cells]) => ({ skill, cells }));
}

const BARS = "▁▂▃▄▅▆▇█";

/** Scores as block characters, lowest ▁ and highest █. */
export function sparkline(values: readonly number[]): string {
  const low = Math.min(...values);
  const span = Math.max(...values) - low;
  return values
    .map((v) => BARS[span === 0 ? 3 : Math.round(((v - low) / span) * (BARS.length - 1))])
    .join("");
}
