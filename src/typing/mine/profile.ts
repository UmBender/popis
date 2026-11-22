import { detectLanguage, stripComments } from "./normalize";
import { compareCodePoints } from "./recency";
import { formatNormalizedTokens, tokenize } from "./tokenize";
import type { CountEntry, RepoFile, StyleProfile } from "./types";

const MAX_IDENTIFIERS = 200;
const MAX_IDIOMS = 100;
const MAX_CONSTANTS = 50;

const SKIP_IDENTIFIERS = new Set([
  "main",
  "solve",
  "solution",
  "_dbg",
  "__dbg",
  "dbg",
  "LOCAL",
  "__VA_ARGS__",
  "__main__",
  "__init__",
  "__name__",
]);

const SKIP_IDIOMS = new Set(["using namespace std;", "return 0;"]);

const NAMED_CONST_RE =
  /(?:constexpr|const)\s+[A-Za-z_]\w*(?:\s+[A-Za-z_]\w*)*\s+([A-Za-z_]\w*)\s*=/;
const DEFINE_CONST_RE = /^#define\s+([A-Z][A-Z0-9_]+)\s+\S/;
const SCI_CONST_RE = /\b(\d+(?:\.\d+)?[eE][+-]?\d+)(?:\s*([+-])\s*(\d+))?\b/g;
const BIG_INT_CONST_RE = /\b(?:998244353|1000000007|1000000009|200005|200100|100005|1000005)\b/g;
const LIMIT_CONST_RE = /\b(?:LLONG_MAX|LLONG_MIN|INT_MAX|INT_MIN|INT64_MAX)\b/g;

function bump(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function topEntries(map: ReadonlyMap<string, number>, limit: number): CountEntry[] {
  return [...map.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || compareCodePoints(a.value, b.value))
    .slice(0, limit);
}

/** Build frequency profile of user identifiers, normalized one-line idioms, and CP constants. */
export function buildProfile(files: readonly RepoFile[]): StyleProfile {
  const identifiers = new Map<string, number>();
  const idioms = new Map<string, number>();
  const constants = new Map<string, number>();

  for (const file of files) {
    const lang = detectLanguage(file.path);
    if (!lang) continue;

    const lines = stripComments(file.content, lang).split("\n");
    for (const rawLine of lines) {
      const trimmed = rawLine.trim();
      if (trimmed.length === 0 || trimmed.startsWith("#include")) continue;

      const tokens = tokenize(trimmed, lang);
      for (const token of tokens) {
        if (token.kind === "ident" && !SKIP_IDENTIFIERS.has(token.text)) {
          bump(identifiers, token.text);
        }
      }

      if (tokens.length >= 3 && !trimmed.endsWith("\\")) {
        const idiom = formatNormalizedTokens(tokens);
        if (!SKIP_IDIOMS.has(idiom)) {
          bump(idioms, idiom);
        }
      }

      const namedConst = NAMED_CONST_RE.exec(trimmed);
      if (namedConst) bump(constants, namedConst[1]!);

      const defineConst = DEFINE_CONST_RE.exec(trimmed);
      if (defineConst) bump(constants, defineConst[1]!);

      for (const m of trimmed.matchAll(SCI_CONST_RE)) {
        const expr = m[2] ? `${m[1]!.toLowerCase()} ${m[2]} ${m[3]!}` : m[1]!.toLowerCase();
        bump(constants, expr);
      }
      for (const m of trimmed.matchAll(BIG_INT_CONST_RE)) {
        bump(constants, m[0]);
      }
      for (const m of trimmed.matchAll(LIMIT_CONST_RE)) {
        bump(constants, m[0]);
      }
    }
  }

  return {
    identifiers: topEntries(identifiers, MAX_IDENTIFIERS),
    idioms: topEntries(idioms, MAX_IDIOMS),
    constants: topEntries(constants, MAX_CONSTANTS),
  };
}
