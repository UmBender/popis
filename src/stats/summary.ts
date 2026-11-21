import type { Drill, TrainingEvent } from "./event";

export const DAY_MS = 86_400_000;

/** One day of one item class, summarized (ADR-T22-1). */
export type DailyRow = {
  /** UTC date, `YYYY-MM-DD`. */
  readonly day: string;
  readonly drill: Drill;
  readonly config: string;
  readonly kc: string;
  readonly n: number;
  readonly ok: number;
  /** Quartiles of the time, in milliseconds. */
  readonly q1: number;
  readonly median: number;
  readonly q3: number;
};

const pad = (value: number, width: number): string => String(value).padStart(width, "0");

/** UTC date of a time, `YYYY-MM-DD` (days to civil date, proleptic Gregorian). */
export function dayOf(at: number): string {
  const z = Math.floor(at / DAY_MS) + 719_468;
  const era = Math.floor(z / 146_097);
  const dayOfEra = z - era * 146_097;
  const yearOfEra = Math.floor(
    (dayOfEra -
      Math.floor(dayOfEra / 1460) +
      Math.floor(dayOfEra / 36_524) -
      Math.floor(dayOfEra / 146_096)) /
      365,
  );
  const dayOfYear =
    dayOfEra - (365 * yearOfEra + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100));
  const shifted = Math.floor((5 * dayOfYear + 2) / 153);
  const day = dayOfYear - Math.floor((153 * shifted + 2) / 5) + 1;
  const month = shifted < 10 ? shifted + 3 : shifted - 9;
  const year = yearOfEra + era * 400 + (month <= 2 ? 1 : 0);
  return `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`;
}

/** Midnight UTC of the day of `at`. */
export function dayStart(at: number): number {
  return Math.floor(at / DAY_MS) * DAY_MS;
}

/** First, second and third quartile of a non-empty list, by linear interpolation. */
export function quartiles(times: readonly number[]): readonly [number, number, number] {
  const sorted = [...times].sort((a, b) => a - b);
  const at = (p: number): number => {
    const pos = p * (sorted.length - 1);
    const lo = Math.floor(pos);
    const low = sorted[lo] as number;
    const high = sorted[Math.ceil(pos)] as number;
    return low + (high - low) * (pos - lo);
  };
  return [at(0.25), at(0.5), at(0.75)];
}

const SEP = "\u0000";

function rowKey(row: Pick<DailyRow, "day" | "drill" | "config" | "kc">): string {
  return [row.day, row.drill, row.config, row.kc].join(SEP);
}

/** Sorted by day, drill, config and kc. */
function sortRows(rows: Iterable<DailyRow>): DailyRow[] {
  return [...rows].sort((a, b) => {
    const [ka, kb] = [rowKey(a), rowKey(b)];
    // Keys are unique, so there is no tie.
    return ka < kb ? -1 : 1;
  });
}

/** One row per day, drill, config and kc, sorted by those. */
export function summarize(events: readonly TrainingEvent[]): DailyRow[] {
  const groups = new Map<string, TrainingEvent[]>();
  for (const event of events) {
    const key = rowKey({
      day: dayOf(event.at),
      drill: event.drill,
      config: event.config,
      kc: event.kc,
    });
    const group = groups.get(key);
    if (group === undefined) groups.set(key, [event]);
    else group.push(event);
  }
  const rows = [...groups.values()].map((group): DailyRow => {
    const first = group[0] as TrainingEvent;
    const [q1, median, q3] = quartiles(group.map((e) => e.timeMs));
    return {
      day: dayOf(first.at),
      drill: first.drill,
      config: first.config,
      kc: first.kc,
      n: group.length,
      ok: group.filter((e) => e.ok).length,
      q1,
      median,
      q3,
    };
  });
  return sortRows(rows);
}

function mergeRows(a: DailyRow, b: DailyRow): DailyRow {
  const n = a.n + b.n;
  const weigh = (x: number, y: number): number => (x * a.n + y * b.n) / n;
  return {
    ...a,
    n,
    ok: a.ok + b.ok,
    q1: weigh(a.q1, b.q1),
    median: weigh(a.median, b.median),
    q3: weigh(a.q3, b.q3),
  };
}

/** Joins two lists of rows, adding the counts of equal keys. */
export function mergeDaily(a: readonly DailyRow[], b: readonly DailyRow[]): DailyRow[] {
  const rows = new Map<string, DailyRow>();
  for (const row of [...a, ...b]) {
    const old = rows.get(rowKey(row));
    rows.set(rowKey(row), old === undefined ? row : mergeRows(old, row));
  }
  return sortRows(rows.values());
}

/** Joins two lists of rows of the same data, keeping the larger row of each key. */
export function unionDaily(a: readonly DailyRow[], b: readonly DailyRow[]): DailyRow[] {
  const rows = new Map<string, DailyRow>();
  for (const row of [...a, ...b]) {
    const old = rows.get(rowKey(row));
    if (old === undefined || row.n > old.n) rows.set(rowKey(row), row);
  }
  return sortRows(rows.values());
}
