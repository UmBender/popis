import { DAY_MS, dayOf, quartiles } from "./summary";

export const MIN_CURVE_ROUNDS = 8;
export const PLATEAU_WINDOW = 10;
export const WEEK_MS = 7 * DAY_MS;
export const WEEKLY_WINDOW_WEEKS = 4;

export type RoundPoint = {
  readonly at: number;
  readonly score: number;
  readonly assisted?: boolean;
};

export type PowerLawFit = {
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly predict: (n: number) => number;
};

export type Plateau = {
  readonly since: number;
  readonly slope: number;
};

export type GoalLine = {
  readonly target: number;
  readonly deadline: string;
  readonly setAt: number;
  readonly baseline: number;
};

export type GoalStatus = {
  readonly expected: number;
  readonly delta: number;
  readonly above: boolean;
};

const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Pure UTC `YYYY-MM-DD` to epoch ms (civil to days, proleptic Gregorian). */
export function parseDay(day: string): number | null {
  const m = DAY_RE.exec(day);
  if (m === null) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const d = Number(m[3]);
  const y = year - (month <= 2 ? 1 : 0);
  const era = Math.floor((y >= 0 ? y : y - 399) / 400);
  const yoe = y - era * 400;
  const doy = Math.floor((153 * (month + (month > 2 ? -3 : 9)) + 2) / 5) + d - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  const ms = (era * 146_097 + doe - 719_468) * DAY_MS;
  return dayOf(ms) === day ? ms : null;
}

/** Median of pairwise slopes `(y_j - y_i) / (x_j - x_i)` for all `x_j !== x_i`. */
export function theilSenSlope(points: readonly (readonly [number, number])[]): number | null {
  const slopes: number[] = [];
  for (let i = 0; i < points.length; i++) {
    const [xi, yi] = points[i] as readonly [number, number];
    for (let j = i + 1; j < points.length; j++) {
      const [xj, yj] = points[j] as readonly [number, number];
      if (xj !== xi) slopes.push((yj - yi) / (xj - xi));
    }
  }
  if (slopes.length === 0) return null;
  return quartiles(slopes)[1];
}

type Candidate = { readonly a: number; readonly b: number; readonly c: number; readonly sse: number };

/** Fits `ln(a - y_i) = ln(b) - c * ln(i)` for fixed `a > max(y)` and returns SSE in y-space. */
function fitForAsymptote(ys: readonly number[], lns: readonly number[], a: number): Candidate | null {
  const n = ys.length;
  let sumU = 0;
  let sumV = 0;
  const vs: number[] = [];
  for (let i = 0; i < n; i++) {
    const v = Math.log(a - (ys[i] as number));
    vs.push(v);
    sumU += lns[i] as number;
    sumV += v;
  }
  const meanU = sumU / n;
  const meanV = sumV / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    const du = (lns[i] as number) - meanU;
    num += du * ((vs[i] as number) - meanV);
    den += du * du;
  }
  const c = -num / den;
  if (!(c > 1e-6)) return null;
  const b = Math.exp(meanV + c * meanU);
  let sse = 0;
  for (let i = 0; i < n; i++) {
    const pred = a - b * Math.pow(i + 1, -c);
    const err = (ys[i] as number) - pred;
    sse += err * err;
  }
  return { a, b, c, sse };
}

/**
 * Fits `score = a - b * n^(-c)` by log-scale least squares over `a > max(score)`.
 * Requires at least `MIN_CURVE_ROUNDS` (8) unassisted rounds and a positive trend.
 */
export function fitPowerLaw(points: readonly RoundPoint[]): PowerLawFit | null {
  const unassisted = points.filter((p) => p.assisted !== true);
  if (unassisted.length < MIN_CURVE_ROUNDS) return null;

  const ys = unassisted.map((p) => p.score);
  const lns = ys.map((_, i) => Math.log(i + 1));
  const yMax = Math.max(...ys);
  const yMin = Math.min(...ys);
  if (yMax <= yMin) return null;
  const span = yMax - yMin;

  // 1D log-spaced grid search for asymptote `a = yMax + delta`, then golden-section refinement.
  const steps = 40;
  const logMin = Math.log(span * 0.01);
  const logMax = Math.log(span * 12);
  let bestIdx = -1;
  let best: Candidate | null = null;
  for (let k = 0; k <= steps; k++) {
    const delta = Math.exp(logMin + ((logMax - logMin) * k) / steps);
    const cand = fitForAsymptote(ys, lns, yMax + delta);
    if (cand !== null && (best === null || cand.sse < best.sse)) {
      best = cand;
      bestIdx = k;
    }
  }
  if (best === null) return null;

  const loIdx = Math.max(0, bestIdx - 1);
  const hiIdx = Math.min(steps, bestIdx + 1);
  let lo = logMin + ((logMax - logMin) * loIdx) / steps;
  let hi = logMin + ((logMax - logMin) * hiIdx) / steps;
  const phi = (Math.sqrt(5) - 1) / 2;
  for (let iter = 0; iter < 30; iter++) {
    const m1 = hi - phi * (hi - lo);
    const m2 = lo + phi * (hi - lo);
    const c1 = fitForAsymptote(ys, lns, yMax + Math.exp(m1));
    const c2 = fitForAsymptote(ys, lns, yMax + Math.exp(m2));
    if (c1 !== null && c1.sse < best.sse) best = c1;
    if (c2 !== null && c2.sse < best.sse) best = c2;
    if (c1 !== null && (c2 === null || c1.sse <= c2.sse)) hi = m2;
    else lo = m1;
  }

  const { a, b, c } = best;
  return { a, b, c, predict: (n: number) => a - b * Math.pow(n, -c) };
}

/** Plateau when Theil–Sen slope over the last 10 unassisted rounds is `<= 0`. */
export function detectPlateau(points: readonly RoundPoint[]): Plateau | null {
  const unassisted = points.filter((p) => p.assisted !== true);
  if (unassisted.length < PLATEAU_WINDOW) return null;
  const tail = unassisted.slice(-PLATEAU_WINDOW);
  const slope = theilSenSlope(tail.map((p, i) => [i + 1, p.score])) as number;
  if (slope > 0) return null;
  return { since: (tail[0] as RoundPoint).at, slope };
}

/** Theil–Sen slope per week over unassisted rounds in the last 4 weeks. */
export function weeklyRate(points: readonly RoundPoint[], now: number): number | null {
  const cutoff = now - WEEKLY_WINDOW_WEEKS * WEEK_MS;
  const recent = points.filter((p) => p.assisted !== true && p.at >= cutoff);
  if (recent.length < 2) return null;
  const firstAt = Math.min(...recent.map((p) => p.at));
  const lastAt = Math.max(...recent.map((p) => p.at));
  if (lastAt - firstAt < DAY_MS) return null;
  return theilSenSlope(recent.map((p) => [(p.at - firstAt) / WEEK_MS, p.score]));
}

/** Linear CBM goal line evaluation at `latest.at`. */
export function evaluateGoal(
  goal: GoalLine,
  latest: { readonly at: number; readonly score: number },
): GoalStatus | null {
  const deadlineMs = parseDay(goal.deadline);
  if (deadlineMs === null || deadlineMs <= goal.setAt) return null;
  const frac = (latest.at - goal.setAt) / (deadlineMs - goal.setAt);
  const expected = goal.baseline + (goal.target - goal.baseline) * frac;
  const delta = latest.score - expected;
  return { expected, delta, above: delta >= 0 };
}
