import type { TrainingEvent } from "./event";
import { quartiles } from "./summary";

export const MAX_OPPORTUNITIES = 20;
export const MIN_CV_HITS = 10;
export const CV_STABLE_THRESHOLD = 0.35;

export type OpportunityPoint = {
  readonly opportunity: number;
  readonly errorRate: number;
  readonly medianMs: number;
  readonly count: number;
};

export type KcStat = {
  readonly kc: string;
  readonly opportunities: number;
  readonly accuracy: number;
  readonly medianMs: number;
  readonly hitsPerMin: number;
  readonly bis: number;
  readonly cv: number | null;
  readonly stability: "estável" | "irregular" | null;
};

function meanAndSd(values: readonly number[]): readonly [number, number] {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return [mean, Math.sqrt(variance)];
}

/** Error rate and median time at the 1st, 2nd, …, Nth opportunity across KCs. */
export function kcCurve(
  events: readonly TrainingEvent[],
  maxOpportunities = MAX_OPPORTUNITIES,
): OpportunityPoint[] {
  const byKc = new Map<string, TrainingEvent[]>();
  for (const event of events) {
    const list = byKc.get(event.kc);
    if (list === undefined) byKc.set(event.kc, [event]);
    else list.push(event);
  }
  const buckets = new Map<number, TrainingEvent[]>();
  for (const list of byKc.values()) {
    list.sort((a, b) => a.at - b.at || a.extra.i - b.extra.i);
    const limit = Math.min(list.length, maxOpportunities);
    for (let k = 0; k < limit; k++) {
      const op = k + 1;
      const bucket = buckets.get(op);
      const item = list[k] as TrainingEvent;
      if (bucket === undefined) buckets.set(op, [item]);
      else bucket.push(item);
    }
  }
  return [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([opportunity, items]): OpportunityPoint => {
      const errors = items.filter((e) => !e.ok).length;
      return {
        opportunity,
        errorRate: errors / items.length,
        medianMs: quartiles(items.map((e) => e.timeMs))[1],
        count: items.length,
      };
    });
}

/**
 * Per-KC metrics ordered by BIS ascending (weakest first).
 * BIS = z(accuracy) - z(medianMs) per Liesefeld & Janczyk (2019).
 * CV is computed on correct times when at least `MIN_CV_HITS` (10) hits exist.
 */
export function kcStats(events: readonly TrainingEvent[]): KcStat[] {
  const byKc = new Map<string, TrainingEvent[]>();
  for (const event of events) {
    const list = byKc.get(event.kc);
    if (list === undefined) byKc.set(event.kc, [event]);
    else list.push(event);
  }
  if (byKc.size === 0) return [];

  const raw = [...byKc.entries()].map(([kc, list]) => {
    const hits = list.filter((e) => e.ok);
    const accuracy = hits.length / list.length;
    const medianMs = quartiles(list.map((e) => e.timeMs))[1];
    const totalMs = list.reduce((sum, e) => sum + e.timeMs, 0);
    const hitsPerMin = totalMs > 0 ? (hits.length / totalMs) * 60_000 : 0;
    let cv: number | null = null;
    if (hits.length >= MIN_CV_HITS) {
      const [mean, sd] = meanAndSd(hits.map((e) => e.timeMs));
      if (mean > 0) cv = sd / mean;
    }
    const stability = cv === null ? null : cv <= CV_STABLE_THRESHOLD ? "estável" : "irregular";
    return {
      kc,
      opportunities: list.length,
      accuracy,
      medianMs,
      hitsPerMin,
      cv,
      stability,
    } as const;
  });

  const [meanAcc, sdAcc] = meanAndSd(raw.map((r) => r.accuracy));
  const [meanMed, sdMed] = meanAndSd(raw.map((r) => r.medianMs));

  return raw
    .map((r): KcStat => {
      const zAcc = sdAcc > 0 ? (r.accuracy - meanAcc) / sdAcc : 0;
      const zMed = sdMed > 0 ? (r.medianMs - meanMed) / sdMed : 0;
      return { ...r, bis: zAcc - zMed };
    })
    .sort((a, b) => a.bis - b.bis || a.kc.localeCompare(b.kc));
}
