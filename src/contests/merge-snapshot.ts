import { mergeContests } from "./agenda";
import { SITES, type Contest, type ContestsSnapshot, type Site, type SourceError } from "./model";

export type FetchOutcome =
  | { readonly ok: true; readonly contests: readonly Contest[] }
  | { readonly ok: false; readonly error: string };

export type FetchResults = Readonly<Record<Site, FetchOutcome>>;

/** Merges fresh per-source fetch results with future contests of failed sources from `previous`. */
export function mergeSnapshot(
  results: FetchResults,
  previous: ContestsSnapshot | null,
  now: number,
): ContestsSnapshot {
  const kept: Contest[] = [];
  const errors: SourceError[] = [];
  const prevContests = previous?.contests ?? [];

  for (const site of SITES) {
    const outcome = results[site];
    if (outcome.ok) {
      for (const c of outcome.contests) {
        if (c.site === site && c.startMs + c.durationMs > now) kept.push(c);
      }
    } else {
      errors.push({ site, message: outcome.error });
      for (const c of prevContests) {
        if (c.site === site && c.startMs + c.durationMs > now) kept.push(c);
      }
    }
  }

  return {
    generatedAt: now,
    contests: mergeContests([kept]),
    errors,
  };
}
