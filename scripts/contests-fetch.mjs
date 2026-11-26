// Fetches upcoming contests from Codeforces, AtCoder, CodeChef and LeetCode
// during build and writes public/contests.json (T38, ADR-T38-1).
//
// Usage: npm run contests:fetch
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { runnerImport } from "vite";

const ROOT = join(import.meta.dirname, "..");
const OUTPUT = join(ROOT, "public", "contests.json");
const TIMEOUT_MS = 20_000;
const DEFAULT_PREVIOUS_URL = "https://umbender.github.io/popis/contests.json";
const USER_AGENT = "popis-contests-fetch/1.0";

const SOURCES = {
  codeforces: {
    url: "https://codeforces.com/api/contest.list?gym=false",
    init: {},
  },
  atcoder: {
    url: "https://atcoder.jp/contests/",
    init: {},
  },
  codechef: {
    url: "https://www.codechef.com/api/list/contests/all?sort_by=START&sorting_order=asc&offset=0&mode=all",
    init: {},
  },
  leetcode: {
    url: "https://leetcode.com/graphql",
    init: {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Referer: "https://leetcode.com/contest/",
      },
      body: JSON.stringify({
        query: "{ upcomingContests { title titleSlug startTime duration } }",
      }),
    },
  },
};

function describeError(err) {
  return err instanceof Error ? err.message : String(err);
}

async function fetchSource(site, parse) {
  const { url, init } = SOURCES[site];
  try {
    const res = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        "User-Agent": USER_AGENT,
        ...(init.headers ?? {}),
      },
    });
    if (!res.ok) {
      return { ok: false, error: `${site}: HTTP ${String(res.status)}` };
    }
    const text = await res.text();
    const contests = parse(text);
    return { ok: true, contests };
  } catch (err) {
    return { ok: false, error: describeError(err) };
  }
}

async function fetchPreviousSnapshot(parseSnapshot) {
  const url = process.env.CONTESTS_PREVIOUS_URL ?? DEFAULT_PREVIOUS_URL;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "User-Agent": USER_AGENT },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return parseSnapshot(data);
  } catch {
    return null;
  }
}

async function main() {
  const [{ module: model }, { module: parsers }, { module: merger }] = await Promise.all([
    runnerImport("/src/contests/model.ts"),
    runnerImport("/src/contests/parse.ts"),
    runnerImport("/src/contests/merge-snapshot.ts"),
  ]);

  const entries = await Promise.all(
    model.SITES.map(async (site) => [site, await fetchSource(site, parsers.PARSERS[site])]),
  );
  const results = Object.fromEntries(entries);
  const anyFailed = entries.some(([, outcome]) => !outcome.ok);
  const previous = anyFailed ? await fetchPreviousSnapshot(model.parseSnapshot) : null;
  const snapshot = merger.mergeSnapshot(results, previous, Date.now());

  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");

  const summary = model.SITES.map((site) => {
    const outcome = results[site];
    const kept = snapshot.contests.filter((c) => c.site === site).length;
    return outcome.ok
      ? `${site}: ${String(kept)}`
      : `${site}: ERROR (${outcome.error}; kept ${String(kept)})`;
  }).join(", ");
  console.log(`contests:fetch wrote ${String(snapshot.contests.length)} contests (${summary})`);
}

await main();
