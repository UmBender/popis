import type { Contest, ContestsSnapshot, Site } from "./model";

export type FetchOutcome =
  | { readonly ok: true; readonly contests: readonly Contest[] }
  | { readonly ok: false; readonly error: string };

export type FetchResults = Readonly<Record<Site, FetchOutcome>>;

export function mergeSnapshot(
  _results: FetchResults,
  _previous: ContestsSnapshot | null,
  _now: number,
): ContestsSnapshot {
  throw new Error("todo");
}
