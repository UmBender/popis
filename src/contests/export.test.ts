import { describe, expect, it } from "vitest";
import { escapeIcsText, foldIcsLine, formatUtcCompact, googleCalendarUrl, toIcs } from "./export";
import type { Contest } from "./model";

const DTSTAMP = Date.UTC(2026, 10, 26, 12, 0, 0);

const SAMPLE: Contest = {
  site: "atcoder",
  id: "abc486",
  name: "AtCoder Beginner Contest 486",
  url: "https://atcoder.jp/contests/abc486",
  startMs: Date.UTC(2026, 10, 28, 12, 0, 0),
  durationMs: 100 * 60_000,
};

const SPECIAL: Contest = {
  site: "codeforces",
  id: "2293",
  name: "Maratona, Edição; Teste \\ 2026 — Programação Competitiva Avançada (Div. 1 + Div. 2)\nExtra",
  url: "https://codeforces.com/contests/2293",
  startMs: Date.UTC(2024, 1, 29, 23, 30, 0),
  durationMs: 2 * 3_600_000,
};

const utf8Bytes = (s: string): number => new TextEncoder().encode(s).length;

describe("formatUtcCompact", () => {
  it.each([
    [Date.UTC(2026, 10, 28, 12, 0, 0), "20261128T120000Z"],
    [Date.UTC(2024, 1, 29, 23, 59, 59), "20240229T235959Z"],
    [Date.UTC(2025, 0, 1, 0, 0, 0), "20250101T000000Z"],
  ])("formatUtcCompact converts %d to %s", (ms, expected) => {
    expect(formatUtcCompact(ms)).toBe(expected);
  });
});

describe("googleCalendarUrl", () => {
  it("googleCalendarUrl builds a Google Calendar template link with UTC dates and encoded text", () => {
    const href = googleCalendarUrl(SAMPLE);

    expect(href).toBe(
      "https://calendar.google.com/calendar/render?action=TEMPLATE" +
        "&text=AtCoder%20Beginner%20Contest%20486" +
        "&dates=20261128T120000Z/20261128T134000Z" +
        "&details=https%3A%2F%2Fatcoder.jp%2Fcontests%2Fabc486",
    );
  });

  it("googleCalendarUrl encodes commas, semicolons, accents and leap-day rollover", () => {
    const href = googleCalendarUrl(SPECIAL);
    const parsed = new URL(href);

    expect(parsed.origin + parsed.pathname).toBe("https://calendar.google.com/calendar/render");
    expect(parsed.searchParams.get("action")).toBe("TEMPLATE");
    expect(parsed.searchParams.get("text")).toBe(SPECIAL.name);
    expect(parsed.searchParams.get("dates")).toBe("20240229T233000Z/20240301T013000Z");
    expect(parsed.searchParams.get("details")).toBe(SPECIAL.url);
  });
});

describe("RFC 5545 .ics export", () => {
  it.each([
    ["plain", "plain"],
    ["a,b;c\\d", "a\\,b\\;c\\\\d"],
    ["line1\nline2", "line1\\nline2"],
    ["line1\r\nline2", "line1\\nline2"],
    ["Edição, São Paulo; 100%", "Edição\\, São Paulo\\; 100%"],
  ])("escapeIcsText escapes %j as %j", (input, expected) => {
    expect(escapeIcsText(input)).toBe(expected);
  });

  it("foldIcsLine folds long ASCII and multibyte UTF-8 lines to at most 75 octets without splitting code points", () => {
    const longUtf8 = `SUMMARY:${"ação,🏆".repeat(25)}`;
    const folded = foldIcsLine(longUtf8);
    const lines = folded.split("\r\n");

    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) {
      expect(utf8Bytes(line)).toBeLessThanOrEqual(75);
      // No replacement characters or broken surrogate halves.
      expect(line).not.toContain("\uFFFD");
    }
    // Unfolding per RFC 5545 restores the exact original line.
    expect(folded.replace(/\r\n /g, "")).toBe(longUtf8);
  });

  it("toIcs exports one contest or multiple filtered contests with stable UIDs, escaping and 75-octet folding", () => {
    const single = toIcs([SAMPLE], DTSTAMP);
    expect(single.endsWith("\r\n")).toBe(true);
    expect(single).toContain("BEGIN:VCALENDAR\r\n");
    expect(single).toContain("VERSION:2.0\r\n");
    expect(single).toContain("UID:atcoder-abc486@popis\r\n");
    expect(single).toContain("DTSTAMP:20261126T120000Z\r\n");
    expect(single).toContain("DTSTART:20261128T120000Z\r\n");
    expect(single).toContain("DTEND:20261128T134000Z\r\n");
    expect(single).toContain("SUMMARY:AtCoder Beginner Contest 486\r\n");
    expect(single).toContain("END:VCALENDAR\r\n");

    const multi = toIcs([SAMPLE, SPECIAL], DTSTAMP);
    const physicalLines = multi.slice(0, -2).split("\r\n");
    for (const line of physicalLines) {
      expect(utf8Bytes(line)).toBeLessThanOrEqual(75);
    }
    const unfolded = multi.replace(/\r\n /g, "");
    expect(unfolded).toContain("UID:atcoder-abc486@popis\r\n");
    expect(unfolded).toContain("UID:codeforces-2293@popis\r\n");
    expect(unfolded).toContain(
      "SUMMARY:Maratona\\, Edição\\; Teste \\\\ 2026 — Programação Competitiva Avançada (Div. 1 + Div. 2)\\nExtra\r\n",
    );
  });
});
