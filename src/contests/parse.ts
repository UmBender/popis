import type { Contest, Site } from "./model";

const ISO_RE =
  /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|([+-])(\d{2}):?(\d{2}))$/;

const DURATION_RE = /^(\d+):(\d{2})$/;

function fail(site: Site, reason: string): never {
  throw new Error(`${site}: ${reason}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseJson(site: Site, raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    fail(site, "invalid JSON");
  }
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return month === 4 || month === 6 || month === 9 || month === 11 ? 30 : 31;
}

/** Parses an ISO-like date-time with timezone offset into UTC ms, validating calendar bounds. */
function parseIsoDateTimeMs(raw: string): number | null {
  const m = ISO_RE.exec(raw.trim());
  if (m === null) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const hour = Number(m[4]);
  const minute = Number(m[5]);
  const second = Number(m[6]);
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > daysInMonth(year, month)) return null;
  if (hour > 23 || minute > 59 || second > 59) return null;
  let offsetMs = 0;
  if (m[7] !== undefined) {
    const tzHour = Number(m[8]);
    const tzMin = Number(m[9]);
    if (tzHour > 23 || tzMin > 59) return null;
    const sign = m[7] === "+" ? 1 : -1;
    offsetMs = sign * (tzHour * 60 + tzMin) * 60_000;
  }
  return Date.UTC(year, month - 1, day, hour, minute, second) - offsetMs;
}

const NAMED_ENTITIES: Readonly<Record<string, string>> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

function decodeHtmlEntities(text: string): string {
  return text.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (full, body: string) => {
    if (body.startsWith("#x")) return String.fromCodePoint(Number.parseInt(body.slice(2), 16));
    if (body.startsWith("#")) return String.fromCodePoint(Number.parseInt(body.slice(1), 10));
    return NAMED_ENTITIES[body] ?? full;
  });
}

function nonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function positiveFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

/** Parses `https://codeforces.com/api/contest.list?gym=false`. */
export function parseCodeforces(raw: string): Contest[] {
  const data = parseJson("codeforces", raw);
  if (!isRecord(data) || data["status"] !== "OK" || !Array.isArray(data["result"])) {
    fail("codeforces", "unexpected API response shape");
  }
  const out: Contest[] = [];
  for (const item of data["result"]) {
    if (!isRecord(item) || typeof item["phase"] !== "string") {
      fail("codeforces", "malformed contest entry");
    }
    if (item["phase"] !== "BEFORE" && item["phase"] !== "CODING") continue;
    const id = item["id"];
    if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) {
      fail("codeforces", "invalid contest id");
    }
    const name = nonEmptyString(item["name"]);
    if (name === null) fail("codeforces", `missing name for contest ${String(id)}`);
    const startSec = positiveFiniteNumber(item["startTimeSeconds"]);
    if (startSec === null) fail("codeforces", `invalid startTimeSeconds for contest ${String(id)}`);
    const durSec = positiveFiniteNumber(item["durationSeconds"]);
    if (durSec === null) fail("codeforces", `invalid durationSeconds for contest ${String(id)}`);
    out.push({
      site: "codeforces",
      id: String(id),
      name,
      url: `https://codeforces.com/contests/${String(id)}`,
      startMs: startSec * 1000,
      durationMs: durSec * 1000,
    });
  }
  return out;
}

/** Parses `https://www.codechef.com/api/list/contests/all?...`. */
export function parseCodechef(raw: string): Contest[] {
  const data = parseJson("codechef", raw);
  if (
    !isRecord(data) ||
    data["status"] !== "success" ||
    !Array.isArray(data["present_contests"]) ||
    !Array.isArray(data["future_contests"])
  ) {
    fail("codechef", "unexpected API response shape");
  }
  const present: unknown[] = data["present_contests"];
  const future: unknown[] = data["future_contests"];
  const items: unknown[] = [...present, ...future];
  const out: Contest[] = [];
  for (const item of items) {
    if (!isRecord(item)) fail("codechef", "malformed contest entry");
    const id = nonEmptyString(item["contest_code"]);
    if (id === null) fail("codechef", "missing contest_code");
    const name = nonEmptyString(item["contest_name"]);
    if (name === null) fail("codechef", `missing contest_name for ${id}`);
    const startRaw = nonEmptyString(item["contest_start_date_iso"]);
    const endRaw = nonEmptyString(item["contest_end_date_iso"]);
    if (startRaw === null || endRaw === null) fail("codechef", `missing ISO dates for ${id}`);
    const startMs = parseIsoDateTimeMs(startRaw);
    const endMs = parseIsoDateTimeMs(endRaw);
    if (startMs === null || endMs === null) fail("codechef", `invalid ISO date for ${id}`);
    const durationMs = endMs - startMs;
    if (durationMs <= 0) fail("codechef", `end date is not after start date for ${id}`);
    out.push({
      site: "codechef",
      id,
      name,
      url: `https://www.codechef.com/${id}`,
      startMs,
      durationMs,
    });
  }
  return out;
}

function extractAtcoderTableBody(html: string, id: string): string | null {
  const openRe = new RegExp(`<div\\b[^>]*\\bid=["']${id}["'][^>]*>`, "i");
  const open = openRe.exec(html);
  if (open === null) return null;
  const after = html.slice(open.index + open[0].length);
  const nextSection = /<div\b[^>]*\bid=["']contest-table-/i.exec(after);
  const chunk = nextSection === null ? after : after.slice(0, nextSection.index);
  const body = /<tbody\b[^>]*>([\s\S]*?)<\/tbody>/i.exec(chunk);
  return body === null ? null : body[1]!;
}

function parseAtcoderRows(tbody: string): Contest[] {
  const out: Contest[] = [];
  for (const rowMatch of tbody.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const rowHtml = rowMatch[1]!;
    const cells = [...rowHtml.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => m[1]!);
    if (cells.length < 3) fail("atcoder", "unexpected row column count");

    const timeMatch = /<time\b[^>]*>([\s\S]*?)<\/time>/i.exec(cells[0]!);
    if (timeMatch === null) fail("atcoder", "missing <time> tag");
    const startMs = parseIsoDateTimeMs(timeMatch[1]!);
    if (startMs === null) fail("atcoder", "invalid start time");

    const linkMatch = /<a\b[^>]*href=["']\/contests\/([^"'/?#]+)["'][^>]*>([\s\S]*?)<\/a>/i.exec(
      cells[1]!,
    );
    if (linkMatch === null) fail("atcoder", "missing contest link");
    const slug = linkMatch[1]!.trim();
    const name = decodeHtmlEntities(linkMatch[2]!.replace(/<[^>]+>/g, "")).trim();
    if (slug.length === 0 || name.length === 0) fail("atcoder", "empty contest slug or name");

    const durText = cells[2]!.replace(/<[^>]+>/g, "").trim();
    const durMatch = DURATION_RE.exec(durText);
    if (durMatch === null) fail("atcoder", `invalid duration "${durText}" for ${slug}`);
    const hours = Number(durMatch[1]);
    const mins = Number(durMatch[2]);
    if (mins >= 60 || (hours === 0 && mins === 0)) {
      fail("atcoder", `invalid duration "${durText}" for ${slug}`);
    }
    out.push({
      site: "atcoder",
      id: slug,
      name,
      url: `https://atcoder.jp/contests/${slug}`,
      startMs,
      durationMs: (hours * 60 + mins) * 60_000,
    });
  }
  return out;
}

/** Parses `https://atcoder.jp/contests/` HTML without a DOM parser. */
export function parseAtcoder(raw: string): Contest[] {
  const upcoming = extractAtcoderTableBody(raw, "contest-table-upcoming");
  if (upcoming === null) fail("atcoder", "missing #contest-table-upcoming table");
  const action = extractAtcoderTableBody(raw, "contest-table-action");
  const daily = extractAtcoderTableBody(raw, "contest-table-daily");
  return [
    ...(action === null ? [] : parseAtcoderRows(action)),
    ...parseAtcoderRows(upcoming),
    ...(daily === null ? [] : parseAtcoderRows(daily)),
  ];
}

/** Parses LeetCode GraphQL `upcomingContests` response. */
export function parseLeetcode(raw: string): Contest[] {
  const parsed = parseJson("leetcode", raw);
  if (
    !isRecord(parsed) ||
    !isRecord(parsed["data"]) ||
    !Array.isArray(parsed["data"]["upcomingContests"])
  ) {
    fail("leetcode", "unexpected GraphQL response shape");
  }
  const out: Contest[] = [];
  for (const item of parsed["data"]["upcomingContests"]) {
    if (!isRecord(item)) fail("leetcode", "malformed contest entry");
    const name = nonEmptyString(item["title"]);
    if (name === null) fail("leetcode", "missing title");
    const id = nonEmptyString(item["titleSlug"]);
    if (id === null) fail("leetcode", `missing titleSlug for ${name}`);
    const startSec = positiveFiniteNumber(item["startTime"]);
    if (startSec === null) fail("leetcode", `invalid startTime for ${id}`);
    const durSec = positiveFiniteNumber(item["duration"]);
    if (durSec === null) fail("leetcode", `invalid duration for ${id}`);
    out.push({
      site: "leetcode",
      id,
      name,
      url: `https://leetcode.com/contest/${id}`,
      startMs: startSec * 1000,
      durationMs: durSec * 1000,
    });
  }
  return out;
}

export const PARSERS: Readonly<Record<Site, (raw: string) => Contest[]>> = {
  codeforces: parseCodeforces,
  atcoder: parseAtcoder,
  codechef: parseCodechef,
  leetcode: parseLeetcode,
};
