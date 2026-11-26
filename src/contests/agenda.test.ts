import { describe, expect, it } from "vitest";
import { dayOf } from "../stats/summary";
import {
  buildAgenda,
  DAY_MS,
  formatCountdown,
  formatDuration,
  formatUpdatedAgo,
  HOUR_MS,
  isStale,
  mergeContests,
  MINUTE_MS,
} from "./agenda";
import type { Contest } from "./model";

const NOW = Date.UTC(2026, 10, 26, 12, 0, 0);

function contest(over: Partial<Contest> & Pick<Contest, "id">): Contest {
  const site = over.site ?? "codeforces";
  return {
    site,
    id: over.id,
    name: over.name ?? `Contest ${over.id}`,
    url: over.url ?? `https://codeforces.com/contests/${over.id}`,
    startMs: over.startMs ?? NOW + 2 * HOUR_MS,
    durationMs: over.durationMs ?? 2 * HOUR_MS,
  };
}

describe("mergeContests", () => {
  it("mergeContests combines sources, deduplicates by site and id, and sorts by start time", () => {
    const cfLate = contest({ site: "codeforces", id: "200", startMs: NOW + 5 * HOUR_MS });
    const acEarly = contest({
      site: "atcoder",
      id: "200",
      url: "https://atcoder.jp/contests/200",
      startMs: NOW + 1 * HOUR_MS,
    });
    const cfDup = contest({
      site: "codeforces",
      id: "200",
      name: "Duplicate",
      startMs: NOW + 5 * HOUR_MS,
    });

    const merged = mergeContests([[cfLate], [acEarly, cfDup]]);

    expect(merged.map((c) => `${c.site}:${c.id}`)).toEqual(["atcoder:200", "codeforces:200"]);
    expect(merged[1]?.name).toBe("Contest 200");
  });

  it("mergeContests breaks start-time ties deterministically by duration, site and id", () => {
    const start = NOW + HOUR_MS;
    const items = [
      contest({ site: "leetcode", id: "b", startMs: start, durationMs: HOUR_MS }),
      contest({ site: "leetcode", id: "a", startMs: start, durationMs: HOUR_MS }),
      contest({ site: "atcoder", id: "z", startMs: start, durationMs: HOUR_MS }),
      contest({ site: "codeforces", id: "1", startMs: start, durationMs: 2 * HOUR_MS }),
    ];

    expect(mergeContests([items]).map((c) => `${c.site}:${c.id}`)).toEqual([
      "atcoder:z",
      "leetcode:a",
      "leetcode:b",
      "codeforces:1",
    ]);
  });
});

describe("buildAgenda", () => {
  it("buildAgenda separates running and upcoming within 14 days and drops finished or distant contests", () => {
    const finished = contest({ id: "done", startMs: NOW - 3 * HOUR_MS, durationMs: 2 * HOUR_MS });
    const endingNow = contest({ id: "edge", startMs: NOW - 2 * HOUR_MS, durationMs: 2 * HOUR_MS });
    const running = contest({ id: "live", startMs: NOW - 30 * MINUTE_MS, durationMs: 2 * HOUR_MS });
    const startingNow = contest({ id: "start-now", startMs: NOW, durationMs: 2 * HOUR_MS });
    const soon = contest({ id: "soon", startMs: NOW + 3 * HOUR_MS });
    const boundary = contest({ id: "day14", startMs: NOW + 14 * DAY_MS });
    const tooFar = contest({ id: "day15", startMs: NOW + 14 * DAY_MS + 1 });

    const agenda = buildAgenda(
      [tooFar, soon, finished, running, boundary, endingNow, startingNow],
      NOW,
      dayOf,
    );

    expect(agenda.running.map((c) => c.id)).toEqual(["live", "start-now"]);
    expect(agenda.upcoming.map((c) => c.id)).toEqual(["soon", "day14"]);
  });

  it("buildAgenda groups upcoming contests using the injected local day function", () => {
    // 2026-11-27 01:00 UTC is still 2026-11-26 in UTC-3, while 04:00 UTC is 2026-11-27 in UTC-3.
    const lateNight = contest({ id: "late", startMs: Date.UTC(2026, 10, 27, 1, 0) });
    const nextDay = contest({ id: "next", startMs: Date.UTC(2026, 10, 27, 4, 0) });
    const utcMinus3Day = (ms: number) => dayOf(ms - 3 * HOUR_MS);

    const agenda = buildAgenda([nextDay, lateNight], NOW, utcMinus3Day);

    expect(agenda.days).toEqual([
      { day: "2026-11-26", contests: [lateNight] },
      { day: "2026-11-27", contests: [nextDay] },
    ]);
  });
});

describe("time formatting", () => {
  it.each([
    [NOW + 2 * DAY_MS + 3 * HOUR_MS + 40 * MINUTE_MS, 2 * HOUR_MS, "começa em 2 d 3 h"],
    [NOW + 2 * DAY_MS, 2 * HOUR_MS, "começa em 2 d"],
    [NOW + 1 * HOUR_MS + 20 * MINUTE_MS, 2 * HOUR_MS, "começa em 1 h 20 min"],
    [NOW + 2 * HOUR_MS, 2 * HOUR_MS, "começa em 2 h"],
    [NOW + 45 * MINUTE_MS, 2 * HOUR_MS, "começa em 45 min"],
    [NOW + 30_000, 2 * HOUR_MS, "começa em menos de 1 min"],
    [NOW - 40 * MINUTE_MS, 2 * HOUR_MS, "termina em 1 h 20 min"],
    [NOW - 115 * MINUTE_MS, 2 * HOUR_MS, "termina em 5 min"],
    [NOW - 120 * MINUTE_MS + 20_000, 2 * HOUR_MS, "termina em menos de 1 min"],
    [NOW - 2 * HOUR_MS, 2 * HOUR_MS, "encerrado"],
  ])("formatCountdown formats start %d and duration %d as %s", (startMs, durationMs, expected) => {
    expect(formatCountdown({ startMs, durationMs }, NOW)).toBe(expected);
  });

  it.each([
    [100 * MINUTE_MS, "1 h 40 min"],
    [2 * HOUR_MS, "2 h"],
    [45 * MINUTE_MS, "45 min"],
    [2 * DAY_MS, "2 d"],
    [2 * DAY_MS + 3 * HOUR_MS, "2 d 3 h"],
  ])("formatDuration formats %d ms as %s", (durationMs, expected) => {
    expect(formatDuration(durationMs)).toBe(expected);
  });

  it("formatUpdatedAgo and isStale report freshness and 24h staleness", () => {
    expect(formatUpdatedAgo(NOW - 20_000, NOW)).toBe("atualizado há menos de 1 min");
    expect(formatUpdatedAgo(NOW - 15 * MINUTE_MS, NOW)).toBe("atualizado há 15 min");
    expect(formatUpdatedAgo(NOW - 2 * HOUR_MS - 5 * MINUTE_MS, NOW)).toBe(
      "atualizado há 2 h 5 min",
    );
    expect(formatUpdatedAgo(NOW - 26 * HOUR_MS, NOW)).toBe("atualizado há 1 d 2 h");

    expect(isStale(NOW - DAY_MS, NOW)).toBe(false);
    expect(isStale(NOW - DAY_MS - 1, NOW)).toBe(true);
  });
});
