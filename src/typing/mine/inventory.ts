import { detectLanguage } from "./normalize";
import { compareCodePoints, compareRecency } from "./recency";
import type { ExcludedFile, FlaggedFile, InventoryResult, RepoFile } from "./types";

const EXCLUDED_TOP_DIRS = new Set(["refs", "icpc_prep", "kotlin", "advent_of_code"]);

const FLAG_PATTERNS: readonly { readonly re: RegExp; readonly reason: string }[] = [
  { re: /cp-algorithms/i, reason: "origin-url: cp-algorithms" },
  { re: /\bkactl\b/i, reason: "origin-url: kactl" },
  { re: /github\.com\//i, reason: "origin-url: github.com" },
  { re: /(?:\/\/|#|\/\*|\*)\s*source\s*:|\bSource:\s*\S+/, reason: "origin-header: Source" },
  {
    re: /\b(?:MIT License|Apache License|GNU General Public License|Boost Software License|BSD \d-Clause|SPDX-License-Identifier|Permission is hereby granted, free of charge|Licensed under the Apache|Copyright\s+(?:\(c\)|©|\d{4}))\b/i,
    reason: "license-header",
  },
];

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\//, "");
}

function normalizeForDedup(content: string): string {
  return content
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n");
}

function detectFlagReason(content: string): string | null {
  for (const { re, reason } of FLAG_PATTERNS) {
    if (re.test(content)) return reason;
  }
  return null;
}

/** Partition repository files into owned, third-party, duplicate, and flagged lists. */
export function buildInventory(files: readonly RepoFile[]): InventoryResult {
  const normalizedFiles = files.map((f) => ({
    ...f,
    path: normalizePath(f.path),
  }));

  // Collect normalized contents of every file inside any `atcoder/` directory.
  const atcoderContents = new Set<string>();
  for (const file of normalizedFiles) {
    const segments = file.path.split("/");
    if (segments.includes("atcoder")) {
      const norm = normalizeForDedup(file.content);
      if (norm.length > 0) atcoderContents.add(norm);
    }
  }

  const thirdParty: ExcludedFile[] = [];
  const flagged: FlaggedFile[] = [];
  const candidates: { readonly file: RepoFile; readonly norm: string }[] = [];

  for (const file of normalizedFiles) {
    const segments = file.path.split("/");
    const topDir = segments[0]!;
    const baseName = segments[segments.length - 1]!;

    if (EXCLUDED_TOP_DIRS.has(topDir)) {
      thirdParty.push({ path: file.path, reason: `excluded-dir: ${topDir}` });
      continue;
    }
    if (segments.includes("atcoder")) {
      thirdParty.push({ path: file.path, reason: "atcoder-dir" });
      continue;
    }
    if (detectLanguage(file.path) === null || baseName === "combined.cpp") {
      thirdParty.push({ path: file.path, reason: "artifact" });
      continue;
    }

    const norm = normalizeForDedup(file.content);
    if (norm.length === 0) {
      thirdParty.push({ path: file.path, reason: "empty" });
      continue;
    }
    if (atcoderContents.has(norm) || /\bnamespace\s+atcoder\b/.test(file.content)) {
      thirdParty.push({ path: file.path, reason: "atcoder-content" });
      continue;
    }

    const flagReason = detectFlagReason(file.content);
    if (flagReason !== null) {
      flagged.push({ path: file.path, reason: flagReason, createdAt: file.createdAt });
      continue;
    }

    candidates.push({ file, norm });
  }

  // Deduplicate keeping the most recently created copy regardless of input order.
  candidates.sort((a, b) => compareRecency(b.file, a.file));
  const seen = new Set<string>();
  const owned: RepoFile[] = [];
  const duplicates: ExcludedFile[] = [];

  for (const { file, norm } of candidates) {
    if (seen.has(norm)) {
      duplicates.push({ path: file.path, reason: "duplicate" });
    } else {
      seen.add(norm);
      owned.push(file);
    }
  }

  owned.sort((a, b) => compareCodePoints(a.path, b.path));
  thirdParty.sort((a, b) => compareCodePoints(a.path, b.path));
  duplicates.sort((a, b) => compareCodePoints(a.path, b.path));
  flagged.sort((a, b) => compareCodePoints(a.path, b.path));

  return { owned, thirdParty, duplicates, flagged };
}
