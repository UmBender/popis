export const SIX_MONTHS_MS = 180 * 24 * 60 * 60 * 1000;

const ISO_RE =
  /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2})(?:Z|([+-])(\d{2}):(\d{2}))?)?/;

const CONTEST_RE = /(?:^|\/)contest\/(\d+)(?:\/|$)/;

/** Parse an ISO-8601 date or timestamp into UTC milliseconds without `new Date()`. */
export function parseTimestampMs(iso: string): number {
  const m = ISO_RE.exec(iso);
  if (!m) return 0;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const hour = m[4] ? Number(m[4]) : 0;
  const minute = m[5] ? Number(m[5]) : 0;
  const second = m[6] ? Number(m[6]) : 0;
  let offsetMs = 0;
  if (m[7]) {
    const sign = m[7] === "+" ? 1 : -1;
    offsetMs = sign * (Number(m[8]) * 60 + Number(m[9])) * 60_000;
  }
  return Date.UTC(year, month - 1, day, hour, minute, second) - offsetMs;
}

/** Extract the YYYY-MM-DD portion of an ISO timestamp. */
export function formatDate(iso: string): string {
  return iso.slice(0, 10);
}

/** Extract `<n>` from `contest/<n>/...`, or null when the path is not a numbered contest. */
export function extractContestNumber(path: string): number | null {
  const m = CONTEST_RE.exec(path);
  return m ? Number(m[1]) : null;
}

/** Locale-independent code-point comparison for deterministic ordering. */
export function compareCodePoints(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * Compare two files by creation recency. Positive means `a` is newer than `b`.
 * Creation date comes first; on ties, higher `contest/<n>` wins, then path.
 */
export function compareRecency(
  a: { readonly createdAt: string; readonly path: string },
  b: { readonly createdAt: string; readonly path: string },
): number {
  const dt = parseTimestampMs(a.createdAt) - parseTimestampMs(b.createdAt);
  if (dt !== 0) return dt;
  const ca = extractContestNumber(a.path) ?? -1;
  const cb = extractContestNumber(b.path) ?? -1;
  if (ca !== cb) return ca - cb;
  return compareCodePoints(a.path, b.path);
}
