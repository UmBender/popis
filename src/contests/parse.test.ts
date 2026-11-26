import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseSnapshot } from "./model";
import { parseAtcoder, parseCodechef, parseCodeforces, parseLeetcode } from "./parse";

const fixture = (name: string): string =>
  readFileSync(join(import.meta.dirname, "fixtures", name), "utf8");

describe("parseCodeforces", () => {
  it("parser extracts upcoming contests from a real Codeforces fixture and ignores finished ones", () => {
    const contests = parseCodeforces(fixture("codeforces.json"));

    expect(contests).toEqual([
      {
        site: "codeforces",
        id: "2293",
        name: "Educational Codeforces Round 197 (Rated for Div. 2)",
        url: "https://codeforces.com/contests/2293",
        startMs: 1_797_258_900_000,
        durationMs: 7_200_000,
      },
      {
        site: "codeforces",
        id: "2282",
        name: "Kotlin Heroes: Episode 15",
        url: "https://codeforces.com/contests/2282",
        startMs: 1_796_740_500_000,
        durationMs: 9_000_000,
      },
      {
        site: "codeforces",
        id: "2292",
        name: "Codeforces Round 1138 (Div. 3)",
        url: "https://codeforces.com/contests/2292",
        startMs: 1_795_790_100_000,
        durationMs: 8_100_000,
      },
    ]);
  });

  it("parser keeps active CODING contests from Codeforces", () => {
    const raw = JSON.stringify({
      status: "OK",
      result: [
        {
          id: 2300,
          name: "Codeforces Round 1140 (Div. 2)",
          phase: "CODING",
          startTimeSeconds: 1_795_800_000,
          durationSeconds: 7200,
        },
      ],
    });

    expect(parseCodeforces(raw)).toEqual([
      {
        site: "codeforces",
        id: "2300",
        name: "Codeforces Round 1140 (Div. 2)",
        url: "https://codeforces.com/contests/2300",
        startMs: 1_795_800_000_000,
        durationMs: 7_200_000,
      },
    ]);
  });

  it.each([
    ["invalid JSON", "not json"],
    ["non-OK status", JSON.stringify({ status: "FAILED", comment: "limit" })],
    ["missing result array", JSON.stringify({ status: "OK", result: null })],
    ["missing name", JSON.stringify({ status: "OK", result: [{ id: 1, phase: "BEFORE", startTimeSeconds: 100, durationSeconds: 3600 }] })],
    ["missing startTimeSeconds", JSON.stringify({ status: "OK", result: [{ id: 1, name: "Round", phase: "BEFORE", durationSeconds: 3600 }] })],
    ["non-positive duration", JSON.stringify({ status: "OK", result: [{ id: 1, name: "Round", phase: "BEFORE", startTimeSeconds: 100, durationSeconds: 0 }] })],
    ["non-integer id", JSON.stringify({ status: "OK", result: [{ id: "abc", name: "Round", phase: "BEFORE", startTimeSeconds: 100, durationSeconds: 3600 }] })],
    ["malformed item", JSON.stringify({ status: "OK", result: [null] })],
  ])("parser throws an error naming codeforces on %s", (_label, raw) => {
    expect(() => parseCodeforces(raw)).toThrow(/codeforces/i);
  });
});

describe("parseCodechef", () => {
  it("parser extracts present and future contests from a CodeChef fixture with +05:30 offsets", () => {
    const contests = parseCodechef(fixture("codechef.json"));

    expect(contests).toEqual([
      {
        site: "codechef",
        id: "START266",
        name: "Starters 266 (Rated till 5 Star)",
        url: "https://www.codechef.com/START266",
        startMs: Date.UTC(2026, 10, 25, 14, 30, 0),
        durationMs: 7_200_000,
      },
      {
        site: "codechef",
        id: "DSAMONDAY030",
        name: "Monday Munch - DSA Challenge 030 (Rated)",
        url: "https://www.codechef.com/DSAMONDAY030",
        startMs: Date.UTC(2026, 10, 30, 13, 30, 0),
        durationMs: 10_800_000,
      },
    ]);
  });

  it("parser returns an empty list when CodeChef reports no present or future contests", () => {
    const raw = JSON.stringify({
      status: "success",
      present_contests: [],
      future_contests: [],
    });

    expect(parseCodechef(raw)).toEqual([]);
  });

  it.each([
    ["invalid JSON", "{"],
    ["non-success status", JSON.stringify({ status: "error", present_contests: [], future_contests: [] })],
    ["missing future_contests", JSON.stringify({ status: "success", present_contests: [] })],
    [
      "missing contest_code",
      JSON.stringify({
        status: "success",
        present_contests: [],
        future_contests: [
          {
            contest_name: "Starters",
            contest_start_date_iso: "2026-11-30T20:00:00+05:30",
            contest_end_date_iso: "2026-11-30T22:00:00+05:30",
          },
        ],
      }),
    ],
    [
      "invalid ISO date",
      JSON.stringify({
        status: "success",
        present_contests: [],
        future_contests: [
          {
            contest_code: "START999",
            contest_name: "Starters",
            contest_start_date_iso: "2026-02-30T20:00:00+05:30",
            contest_end_date_iso: "2026-03-01T22:00:00+05:30",
          },
        ],
      }),
    ],
    [
      "end date before start date",
      JSON.stringify({
        status: "success",
        present_contests: [],
        future_contests: [
          {
            contest_code: "START999",
            contest_name: "Starters",
            contest_start_date_iso: "2026-11-30T22:00:00+05:30",
            contest_end_date_iso: "2026-11-30T20:00:00+05:30",
          },
        ],
      }),
    ],
  ])("parser throws an error naming codechef on %s", (_label, raw) => {
    expect(() => parseCodechef(raw)).toThrow(/codechef/i);
  });
});

describe("parseAtcoder", () => {
  it("parser extracts upcoming and daily contests from a real AtCoder HTML fixture", () => {
    const contests = parseAtcoder(fixture("atcoder.html"));

    expect(contests).toEqual([
      {
        site: "atcoder",
        id: "abc486",
        name: "AtCoder Beginner Contest 486",
        url: "https://atcoder.jp/contests/abc486",
        startMs: Date.UTC(2026, 10, 28, 12, 0, 0),
        durationMs: 100 * 60_000,
      },
      {
        site: "atcoder",
        id: "ahc075",
        name: "AtCoder Heuristic Contest 075",
        url: "https://atcoder.jp/contests/ahc075",
        startMs: Date.UTC(2026, 10, 29, 10, 0, 0),
        durationMs: 240 * 60_000,
      },
      {
        site: "atcoder",
        id: "agc080",
        name: "AtCoder Grand Contest 080",
        url: "https://atcoder.jp/contests/agc080",
        startMs: Date.UTC(2026, 11, 13, 12, 0, 0),
        durationMs: 180 * 60_000,
      },
      {
        site: "atcoder",
        id: "awc0209",
        name: "AtCoder Weekday Contest 0209 Beta",
        url: "https://atcoder.jp/contests/awc0209",
        startMs: Date.UTC(2026, 10, 26, 11, 0, 0),
        durationMs: 60 * 60_000,
      },
    ]);
  });

  it("parser reads active contests, long durations and HTML entities from AtCoder", () => {
    const html = `
      <div id="contest-table-action">
        <table><tbody>
          <tr>
            <td><time class="fixtime">2026-11-26 19:00:00+0900</time></td>
            <td><a href="/contests/ahc074">HACK &amp; RUN &#39;26</a></td>
            <td>240:00</td>
            <td>All</td>
          </tr>
        </tbody></table>
      </div>
      <div id="contest-table-upcoming">
        <table><tbody></tbody></table>
      </div>
    `;

    expect(parseAtcoder(html)).toEqual([
      {
        site: "atcoder",
        id: "ahc074",
        name: "HACK & RUN '26",
        url: "https://atcoder.jp/contests/ahc074",
        startMs: Date.UTC(2026, 10, 26, 10, 0, 0),
        durationMs: 240 * 3_600_000,
      },
    ]);
  });

  it.each([
    ["HTML without upcoming table", "<html><body><p>Maintenance</p></body></html>"],
    [
      "upcoming div without tbody",
      '<div id="contest-table-upcoming"><table></table></div>',
    ],
    [
      "row missing time tag",
      '<div id="contest-table-upcoming"><table><tbody><tr><td>soon</td><td><a href="/contests/abc1">ABC</a></td><td>01:40</td></tr></tbody></table></div>',
    ],
    [
      "row with invalid date",
      '<div id="contest-table-upcoming"><table><tbody><tr><td><time>2026-02-29 21:00:00+0900</time></td><td><a href="/contests/abc1">ABC</a></td><td>01:40</td></tr></tbody></table></div>',
    ],
    [
      "row missing contest link",
      '<div id="contest-table-upcoming"><table><tbody><tr><td><time>2026-11-28 21:00:00+0900</time></td><td>ABC</td><td>01:40</td></tr></tbody></table></div>',
    ],
    [
      "row with invalid duration",
      '<div id="contest-table-upcoming"><table><tbody><tr><td><time>2026-11-28 21:00:00+0900</time></td><td><a href="/contests/abc1">ABC</a></td><td>01:60</td></tr></tbody></table></div>',
    ],
  ])("parser throws an error naming atcoder on %s", (_label, html) => {
    expect(() => parseAtcoder(html)).toThrow(/atcoder/i);
  });
});

describe("parseLeetcode", () => {
  it("parser extracts upcoming contests from a real LeetCode GraphQL fixture", () => {
    const contests = parseLeetcode(fixture("leetcode.json"));

    expect(contests).toEqual([
      {
        site: "leetcode",
        id: "weekly-contest-530",
        name: "Weekly Contest 530",
        url: "https://leetcode.com/contest/weekly-contest-530",
        startMs: 1_795_919_400_000,
        durationMs: 5_400_000,
      },
    ]);
  });

  it.each([
    ["invalid JSON", "<html>502</html>"],
    ["missing data", JSON.stringify({ errors: [{ message: "denied" }] })],
    ["missing upcomingContests", JSON.stringify({ data: {} })],
    [
      "missing titleSlug",
      JSON.stringify({
        data: { upcomingContests: [{ title: "Weekly 1", startTime: 1_795_919_400, duration: 5400 }] },
      }),
    ],
    [
      "invalid startTime",
      JSON.stringify({
        data: {
          upcomingContests: [
            { title: "Weekly 1", titleSlug: "weekly-1", startTime: "soon", duration: 5400 },
          ],
        },
      }),
    ],
    [
      "non-positive duration",
      JSON.stringify({
        data: {
          upcomingContests: [
            { title: "Weekly 1", titleSlug: "weekly-1", startTime: 1_795_919_400, duration: 0 },
          ],
        },
      }),
    ],
  ])("parser throws an error naming leetcode on %s", (_label, raw) => {
    expect(() => parseLeetcode(raw)).toThrow(/leetcode/i);
  });
});

describe("parseSnapshot", () => {
  it("parseSnapshot validates well-formed snapshots and rejects corrupt payloads", () => {
    const valid = {
      generatedAt: Date.UTC(2026, 10, 26, 12, 0),
      contests: [
        {
          site: "codeforces",
          id: "2292",
          name: "CF 1138",
          url: "https://codeforces.com/contests/2292",
          startMs: Date.UTC(2026, 10, 27, 14, 35),
          durationMs: 8_100_000,
        },
      ],
      errors: [{ site: "atcoder", message: "timeout" }],
    };

    expect(parseSnapshot(valid)).toEqual(valid);
    expect(parseSnapshot(null)).toBeNull();
    expect(parseSnapshot({ generatedAt: "bad", contests: [], errors: [] })).toBeNull();
    expect(
      parseSnapshot({
        generatedAt: 1000,
        contests: [{ site: "unknown", id: "1", name: "x", url: "u", startMs: 1, durationMs: 1 }],
        errors: [],
      }),
    ).toBeNull();
    expect(
      parseSnapshot({
        generatedAt: 1000,
        contests: [],
        errors: [{ site: "other", message: "boom" }],
      }),
    ).toBeNull();
  });
});
