import { describe, expect, it } from "vitest";
import { HOUR_MS } from "./agenda";
import { mergeSnapshot, type FetchResults } from "./merge-snapshot";
import type { Contest, ContestsSnapshot } from "./model";

const NOW = Date.UTC(2026, 10, 26, 12, 0, 0);

function item(site: Contest["site"], id: string, startOffsetH: number, durationH = 2): Contest {
  return {
    site,
    id,
    name: `${site} ${id}`,
    url: `https://example.test/${site}/${id}`,
    startMs: NOW + startOffsetH * HOUR_MS,
    durationMs: durationH * HOUR_MS,
  };
}

describe("mergeSnapshot", () => {
  it("mergeSnapshot keeps fresh contests from all four sources when every source succeeds", () => {
    const results: FetchResults = {
      codeforces: { ok: true, contests: [item("codeforces", "1", 5), item("codeforces", "old", -5)] },
      atcoder: { ok: true, contests: [item("atcoder", "abc1", 2)] },
      codechef: { ok: true, contests: [item("codechef", "st1", 8)] },
      leetcode: { ok: true, contests: [item("leetcode", "wc1", 1)] },
    };

    const next = mergeSnapshot(results, null, NOW);

    expect(next.generatedAt).toBe(NOW);
    expect(next.errors).toEqual([]);
    expect(next.contests.map((c) => `${c.site}:${c.id}`)).toEqual([
      "leetcode:wc1",
      "atcoder:abc1",
      "codeforces:1",
      "codechef:st1",
    ]);
  });

  it("mergeSnapshot preserves future contests of a failed source from the previous snapshot and records the error", () => {
    const previous: ContestsSnapshot = {
      generatedAt: NOW - 6 * HOUR_MS,
      contests: [
        item("atcoder", "past", -4, 2),
        item("atcoder", "running", -1, 2),
        item("atcoder", "future", 10, 2),
        item("codeforces", "stale-cf", 12, 2),
      ],
      errors: [],
    };
    const results: FetchResults = {
      codeforces: { ok: true, contests: [item("codeforces", "fresh-cf", 4)] },
      atcoder: { ok: false, error: "HTTP 503" },
      codechef: { ok: true, contests: [] },
      leetcode: { ok: true, contests: [item("leetcode", "wc1", 2)] },
    };

    const next = mergeSnapshot(results, previous, NOW);

    expect(next.errors).toEqual([{ site: "atcoder", message: "HTTP 503" }]);
    expect(next.contests.map((c) => `${c.site}:${c.id}`)).toEqual([
      "atcoder:running",
      "leetcode:wc1",
      "codeforces:fresh-cf",
      "atcoder:future",
    ]);
  });

  it("mergeSnapshot still succeeds with the remaining sources when a source fails and no previous snapshot exists", () => {
    const results: FetchResults = {
      codeforces: { ok: true, contests: [item("codeforces", "cf1", 3)] },
      atcoder: { ok: false, error: "timeout" },
      codechef: { ok: false, error: "HTTP 500" },
      leetcode: { ok: true, contests: [] },
    };

    const next = mergeSnapshot(results, null, NOW);

    expect(next.contests.map((c) => `${c.site}:${c.id}`)).toEqual(["codeforces:cf1"]);
    expect(next.errors).toEqual([
      { site: "atcoder", message: "timeout" },
      { site: "codechef", message: "HTTP 500" },
    ]);
  });
});
