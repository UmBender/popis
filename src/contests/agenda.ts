import type { Contest } from "./model";

export const MINUTE_MS = 60_000;
export const HOUR_MS = 3_600_000;
export const DAY_MS = 86_400_000;
export const HORIZON_DAYS = 14;
export const HORIZON_MS = HORIZON_DAYS * DAY_MS;
export const STALE_MS = DAY_MS;

export type DayGroup = {
  readonly day: string;
  readonly contests: readonly Contest[];
};

export type Agenda = {
  readonly running: readonly Contest[];
  readonly upcoming: readonly Contest[];
  readonly days: readonly DayGroup[];
};

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function compareContests(a: Contest, b: Contest): number {
  if (a.startMs !== b.startMs) return a.startMs - b.startMs;
  if (a.durationMs !== b.durationMs) return a.durationMs - b.durationMs;
  const siteCmp = compareText(a.site, b.site);
  if (siteCmp !== 0) return siteCmp;
  return compareText(a.id, b.id);
}

/** Unique key of a contest across sources (`site:id`). */
export function contestKey(contest: Pick<Contest, "site" | "id">): string {
  return `${contest.site}:${contest.id}`;
}

/** Combines contest lists, deduplicates by `site + id` (first wins) and sorts by start time. */
export function mergeContests(sources: readonly (readonly Contest[])[]): Contest[] {
  const seen = new Set<string>();
  const unique: Contest[] = [];
  for (const list of sources) {
    for (const item of list) {
      const key = contestKey(item);
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(item);
    }
  }
  return unique.sort(compareContests);
}

/** Groups contests by the day key returned by `dayOf`, preserving order. */
export function groupByDay(
  contests: readonly Contest[],
  dayOf: (ms: number) => string,
): DayGroup[] {
  const groups = new Map<string, Contest[]>();
  for (const item of contests) {
    const day = dayOf(item.startMs);
    const bucket = groups.get(day);
    if (bucket === undefined) groups.set(day, [item]);
    else bucket.push(item);
  }
  return [...groups.entries()].map(([day, items]) => ({ day, contests: items }));
}

/** Splits contests into running now and upcoming within `horizonMs`, grouped by local day. */
export function buildAgenda(
  contests: readonly Contest[],
  now: number,
  dayOf: (ms: number) => string,
  horizonMs = HORIZON_MS,
): Agenda {
  const sorted = mergeContests([contests]);
  const running: Contest[] = [];
  const upcoming: Contest[] = [];
  const limit = now + horizonMs;
  for (const item of sorted) {
    const endMs = item.startMs + item.durationMs;
    if (endMs <= now) continue;
    if (item.startMs <= now) running.push(item);
    else if (item.startMs <= limit) upcoming.push(item);
  }
  return { running, upcoming, days: groupByDay(upcoming, dayOf) };
}

function formatSpan(ms: number): string {
  if (ms < MINUTE_MS) return "menos de 1 min";
  const totalMin = Math.floor(ms / MINUTE_MS);
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const mins = totalMin % 60;
  if (days > 0) return hours > 0 ? `${String(days)} d ${String(hours)} h` : `${String(days)} d`;
  if (hours > 0) {
    return mins > 0 ? `${String(hours)} h ${String(mins)} min` : `${String(hours)} h`;
  }
  return `${String(mins)} min`;
}

/** Relative start or end label for one contest at `now`. */
export function formatCountdown(
  contest: Pick<Contest, "startMs" | "durationMs">,
  now: number,
): string {
  if (now < contest.startMs) return `começa em ${formatSpan(contest.startMs - now)}`;
  const endMs = contest.startMs + contest.durationMs;
  if (now < endMs) return `termina em ${formatSpan(endMs - now)}`;
  return "encerrado";
}

/** Human-readable contest length, e.g. `1 h 40 min` or `2 d`. */
export function formatDuration(durationMs: number): string {
  return formatSpan(Math.max(0, durationMs));
}

/** Relative age of a snapshot, e.g. `atualizado há 15 min`. */
export function formatUpdatedAgo(generatedAt: number, now: number): string {
  return `atualizado há ${formatSpan(Math.max(0, now - generatedAt))}`;
}

/** True when a snapshot is older than 24 h relative to `now`. */
export function isStale(generatedAt: number, now: number): boolean {
  return now - generatedAt > STALE_MS;
}
