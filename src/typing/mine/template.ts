import { detectLanguage, normalizeSnippet, stripComments } from "./normalize";
import {
  SIX_MONTHS_MS,
  compareCodePoints,
  compareRecency,
  formatDate,
  parseTimestampMs,
} from "./recency";
import { tokenize } from "./tokenize";
import type { RepoFile, TemplateResult } from "./types";

interface ExtractedHeader {
  readonly file: RepoFile;
  readonly key: string;
  readonly headerRaw: string;
  readonly mainSkeleton: string;
}

const HEADER_LINE_RE = /^(?:#include\b|#define\b|using\b|typedef\b|mt19937(?:_64)?\b)/;
const DBG_FN_RE = /^(?:template\s*<[^>]*>\s*)?void\s+_{1,2}dbg\s*\(/;
const MAIN_RE = /^(?:int32_t|int|signed)\s+main\s*\([^)]*\)\s*\{/;
const FAST_IO_RE = /\b(?:sync_with_stdio|cin\.tie|cout\.tie)\b/;

function normalizeHeaderLine(line: string): string {
  return tokenize(line, "cpp")
    .map((t) => t.text)
    .join(" ");
}

function countBraceDelta(line: string): number {
  let delta = 0;
  for (const ch of line) {
    if (ch === "{") delta++;
    else if (ch === "}") delta--;
  }
  return delta;
}

function extractHeaderLines(lines: readonly string[]): { raw: string; key: string } | null {
  const raw: string[] = [];
  const norm: string[] = [];
  let ifdefDepth = 0;
  let dbgBraceDepth = 0;
  let inContinuation = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      if (raw.length > 0 && ifdefDepth === 0 && dbgBraceDepth === 0 && !inContinuation) {
        raw.push("");
      }
      continue;
    }

    if (inContinuation) {
      raw.push(line);
      norm.push(normalizeHeaderLine(trimmed));
      inContinuation = trimmed.endsWith("\\");
      continue;
    }

    if (ifdefDepth > 0) {
      raw.push(line);
      norm.push(normalizeHeaderLine(trimmed));
      if (/^#if(?:def|ndef)?\b/.test(trimmed)) ifdefDepth++;
      else if (/^#endif\b/.test(trimmed)) ifdefDepth--;
      continue;
    }

    if (dbgBraceDepth > 0) {
      raw.push(line);
      norm.push(normalizeHeaderLine(trimmed));
      dbgBraceDepth += countBraceDelta(trimmed);
      continue;
    }

    if (/^#if(?:def|ndef)\b/.test(trimmed)) {
      ifdefDepth = 1;
      raw.push(line);
      norm.push(normalizeHeaderLine(trimmed));
      continue;
    }

    if (HEADER_LINE_RE.test(trimmed)) {
      raw.push(line);
      norm.push(normalizeHeaderLine(trimmed));
      inContinuation = trimmed.endsWith("\\");
      continue;
    }

    if (DBG_FN_RE.test(trimmed)) {
      raw.push(line);
      norm.push(normalizeHeaderLine(trimmed));
      dbgBraceDepth += countBraceDelta(trimmed);
      continue;
    }

    break;
  }

  if (norm.length < 2) return null;
  return { raw: raw.join("\n").trimEnd(), key: norm.join("\n") };
}

function extractMainSkeleton(lines: readonly string[]): string {
  const start = lines.findIndex((l) => MAIN_RE.test(l.trim()));
  if (start < 0) return "";

  let depth = 0;
  const bodyLines: string[] = [];
  for (let i = start; i < lines.length; i++) {
    const line = lines[i]!;
    bodyLines.push(line);
    for (const ch of line) {
      if (ch === "{") depth++;
      else if (ch === "}") depth--;
    }
    if (depth === 0) break;
  }

  const headerLine = bodyLines[0]!.trim().replace(/\)\s*\{/, ") {");
  const fastIo = bodyLines
    .slice(1, -1)
    .map((l) => l.trim())
    .filter((l) => FAST_IO_RE.test(l));
  const hasReturnZero = bodyLines.slice(1, -1).some((l) => /^return\s+0\s*;$/.test(l.trim()));

  const out = [headerLine];
  for (const io of fastIo) out.push(`    ${io}`);
  if (hasReturnZero) {
    out.push("");
    out.push("    return 0;");
  }
  out.push("}");
  return out.join("\n");
}

function extractFileHeader(file: RepoFile): ExtractedHeader | null {
  const stripped = stripComments(file.content, "cpp");
  const lines = stripped.split("\n");
  const header = extractHeaderLines(lines);
  if (!header) return null;
  return {
    file,
    key: header.key,
    headerRaw: header.raw,
    mainSkeleton: extractMainSkeleton(lines),
  };
}

/**
 * Detect the most frequent C++ header + empty main skeleton among files created
 * in the last 6 months (anchored to the latest creation date in the input).
 */
export function detectTemplate(files: readonly RepoFile[]): TemplateResult | null {
  const cppFiles = files.filter((f) => detectLanguage(f.path) === "cpp");
  if (cppFiles.length === 0) return null;

  let maxTs = -Infinity;
  for (const file of cppFiles) {
    const ts = parseTimestampMs(file.createdAt);
    if (ts > maxTs) maxTs = ts;
  }
  const cutoff = maxTs - SIX_MONTHS_MS;

  const allExtracted: ExtractedHeader[] = [];
  for (const file of cppFiles) {
    const h = extractFileHeader(file);
    if (h) allExtracted.push(h);
  }
  if (allExtracted.length === 0) return null;

  const recentExtracted = allExtracted.filter((h) => parseTimestampMs(h.file.createdAt) >= cutoff);
  const pool = recentExtracted.length > 0 ? recentExtracted : allExtracted;

  const recentGroups = new Map<string, ExtractedHeader[]>();
  for (const entry of pool) {
    const group = recentGroups.get(entry.key);
    if (group) group.push(entry);
    else recentGroups.set(entry.key, [entry]);
  }

  let bestKey = "";
  let bestRecent: ExtractedHeader[] = [];
  let bestCanonical: ExtractedHeader | null = null;

  for (const [key, group] of recentGroups) {
    let newest = group[0]!;
    for (let i = 1; i < group.length; i++) {
      if (compareRecency(group[i]!.file, newest.file) > 0) {
        newest = group[i]!;
      }
    }
    const better =
      bestCanonical === null ||
      group.length > bestRecent.length ||
      (group.length === bestRecent.length &&
        (compareRecency(newest.file, bestCanonical.file) > 0 ||
          (compareRecency(newest.file, bestCanonical.file) === 0 &&
            compareCodePoints(key, bestKey) < 0)));
    if (better) {
      bestKey = key;
      bestRecent = group;
      bestCanonical = newest;
    }
  }

  const chosen = bestCanonical!;
  const allMatching = allExtracted.filter((h) => h.key === bestKey);
  let firstTs = Infinity;
  let lastTs = -Infinity;
  let firstSeen = "";
  let lastSeen = "";
  for (const entry of allMatching) {
    const ts = parseTimestampMs(entry.file.createdAt);
    if (ts < firstTs) {
      firstTs = ts;
      firstSeen = formatDate(entry.file.createdAt);
    }
    if (ts > lastTs) {
      lastTs = ts;
      lastSeen = formatDate(entry.file.createdAt);
    }
  }

  const combined = chosen.mainSkeleton
    ? `${chosen.headerRaw}\n\n${chosen.mainSkeleton}`
    : chosen.headerRaw;

  return {
    code: normalizeSnippet(combined, "cpp"),
    fileCount: allMatching.length,
    recentFileCount: bestRecent.length,
    firstSeen,
    lastSeen,
    canonicalPath: chosen.file.path,
  };
}
