import { dayOf } from "../stats/summary";
import { SITE_LABEL, type Contest } from "./model";

const SEC_PER_DAY = 86_400;
const MAX_LINE_OCTETS = 75;

const pad2 = (n: number): string => String(n).padStart(2, "0");

/** Formats Unix epoch ms as UTC compact ISO-8601 (`YYYYMMDDTHHMMSSZ`) without `Date`. */
export function formatUtcCompact(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const secOfDay = ((totalSec % SEC_PER_DAY) + SEC_PER_DAY) % SEC_PER_DAY;
  const hour = Math.floor(secOfDay / 3600);
  const minute = Math.floor((secOfDay % 3600) / 60);
  const second = secOfDay % 60;
  const datePart = dayOf(totalSec * 1000).replace(/-/g, "");
  return `${datePart}T${pad2(hour)}${pad2(minute)}${pad2(second)}Z`;
}

/** Escapes `\\`, `;`, `,` and line breaks for RFC 5545 TEXT values. */
export function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

function utf8Octets(ch: string): number {
  const cp = ch.codePointAt(0) ?? 0;
  if (cp <= 0x7f) return 1;
  if (cp <= 0x7ff) return 2;
  if (cp <= 0xffff) return 3;
  return 4;
}

/** Folds one iCalendar content line at 75 UTF-8 octets without splitting code points (RFC 5545 §3.1). */
export function foldIcsLine(line: string): string {
  const chunks: string[] = [];
  let current = "";
  let octets = 0;
  for (const ch of line) {
    const size = utf8Octets(ch);
    if (octets > 0 && octets + size > MAX_LINE_OCTETS) {
      chunks.push(current);
      current = ` ${ch}`;
      octets = 1 + size;
    } else {
      current += ch;
      octets += size;
    }
  }
  chunks.push(current);
  return chunks.join("\r\n");
}

/** Google Calendar "add event" link with UTC dates and contest URL in details. */
export function googleCalendarUrl(contest: Contest): string {
  const dates = `${formatUtcCompact(contest.startMs)}/${formatUtcCompact(contest.startMs + contest.durationMs)}`;
  return (
    `https://calendar.google.com/calendar/render?action=TEMPLATE` +
    `&text=${encodeURIComponent(contest.name)}` +
    `&dates=${dates}` +
    `&details=${encodeURIComponent(contest.url)}`
  );
}

/** Builds an RFC 5545 `.ics` calendar containing the given contests. */
export function toIcs(contests: readonly Contest[], dtstampMs: number): string {
  const stamp = formatUtcCompact(dtstampMs);
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//popis//Agenda de contests//PT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];
  for (const c of contests) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${c.site}-${c.id}@popis`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${formatUtcCompact(c.startMs)}`,
      `DTEND:${formatUtcCompact(c.startMs + c.durationMs)}`,
      `SUMMARY:${escapeIcsText(c.name)}`,
      `DESCRIPTION:${escapeIcsText(`${SITE_LABEL[c.site]}\n${c.url}`)}`,
      `URL:${c.url}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return `${lines.map(foldIcsLine).join("\r\n")}\r\n`;
}
