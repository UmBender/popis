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

export function contestKey(_contest: Pick<Contest, "site" | "id">): string {
  throw new Error("todo");
}

export function mergeContests(_sources: readonly (readonly Contest[])[]): Contest[] {
  throw new Error("todo");
}

export function groupByDay(
  _contests: readonly Contest[],
  _dayOf: (ms: number) => string,
): DayGroup[] {
  throw new Error("todo");
}

export function buildAgenda(
  _contests: readonly Contest[],
  _now: number,
  _dayOf: (ms: number) => string,
  _horizonMs = HORIZON_MS,
): Agenda {
  throw new Error("todo");
}

export function formatCountdown(
  _contest: Pick<Contest, "startMs" | "durationMs">,
  _now: number,
): string {
  throw new Error("todo");
}

export function formatDuration(_durationMs: number): string {
  throw new Error("todo");
}

export function formatUpdatedAgo(_generatedAt: number, _now: number): string {
  throw new Error("todo");
}

export function isStale(_generatedAt: number, _now: number): boolean {
  throw new Error("todo");
}
