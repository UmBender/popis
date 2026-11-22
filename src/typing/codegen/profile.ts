import type { Rng } from "../../core/rng";
import profileJson from "../library/profile.json";
import type { CodegenProfile, ProfilePools, WeightedItem } from "./types";

export const DEFAULT_PROFILE: CodegenProfile = profileJson;

const BASE_RULE_WEIGHT = 12;
const IDENT_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
const LOWER_SHORT_RE = /^[a-z]$/;
const LOWER_WORD_RE = /^[a-z][a-z0-9_]+$/;
const TYPE_NAME_RE = /^[A-Z](?:[A-Za-z0-9_]*[a-z][A-Za-z0-9_]*)?$/;
const CONST_NAME_RE = /^[A-Z][A-Z0-9_]{2,7}$/;
const MOD_VALUE_RE = /^(?:998244353|1000000007|1000000009|1e9 \+ 7|1e9 \+ 9)$/;
const INF_VALUE_RE = /^(?:LLONG_MAX|INT_MAX|INT64_MAX|1e18 \+ 1000|1e18|1e9)$/;
const LIMIT_VALUE_RE = /^(?:2e5 \+ 100|200100|1e6 \+ 100|100005|1000005)$/;

const CPP_TYPE_SET = new Set(["ll", "i32", "i64"]);
const LOOP_VAR_SET = new Set(["i", "j", "k"]);
const LIMIT_MACROS = new Set(["INT_MAX", "INT_MIN", "INT64_MAX", "LLONG_MAX", "LLONG_MIN"]);

const BLOCKED_IDENTIFIERS = new Set([
  "int",
  "long",
  "auto",
  "const",
  "return",
  "for",
  "while",
  "if",
  "else",
  "struct",
  "void",
  "bool",
  "char",
  "double",
  "float",
  "string",
  "vector",
  "pair",
  "map",
  "set",
  "queue",
  "stack",
  "sort",
  "min",
  "max",
  "swap",
  "abs",
  "cin",
  "cout",
  "endl",
  "begin",
  "end",
  "size",
  "push_back",
  "lower_bound",
  "upper_bound",
  "range",
  "len",
  "list",
  "dict",
  "sorted",
  "defaultdict",
  "bisect_left",
  "heapq",
  "input",
  "print",
  "from",
  "import",
  "in",
  "is",
  "not",
  "and",
  "or",
  "def",
  "class",
  "lambda",
  "pass",
  "None",
  "True",
  "False",
  "elif",
  "with",
  "as",
  "yield",
  "raise",
  "del",
  "try",
  "except",
  "finally",
  "global",
  "nonlocal",
  "assert",
  "break",
  "continue",
  "main",
  "using",
  "namespace",
  "std",
  "define",
  "include",
  "signed",
  "int32_t",
  "int64_t",
  "LLONG_MAX",
  "INT_MAX",
  "INT_MIN",
  "INT64_MAX",
  "first",
  "second",
  "key",
  "it",
  "cmp",
  "vi",
  "pii",
]);

function weightOf(count: number): number {
  return Math.max(1, Math.round(Math.sqrt(count)));
}

function mergePool(
  primary: readonly WeightedItem<string>[],
  fallback: readonly string[],
  fallbackWeight = 6,
): WeightedItem<string>[] {
  const seen = new Set(primary.map((item) => item.value));
  const out = [...primary];
  for (const value of fallback) {
    if (!seen.has(value)) {
      out.push({ value, weight: fallbackWeight });
    }
  }
  return out;
}

/** Builds weighted identifier and constant pools from a mined `CodegenProfile`. */
export function buildProfilePools(profile: CodegenProfile): ProfilePools {
  const validIdents = profile.identifiers.filter(
    (entry) =>
      IDENT_RE.test(entry.value) &&
      entry.value.length <= 8 &&
      !BLOCKED_IDENTIFIERS.has(entry.value),
  );

  const shortPrimary = validIdents
    .filter((entry) => LOWER_SHORT_RE.test(entry.value))
    .slice(0, 14)
    .map((entry) => ({ value: entry.value, weight: weightOf(entry.count) }));

  const loopPrimary = shortPrimary.filter((entry) => LOOP_VAR_SET.has(entry.value));

  const wordPrimary = validIdents
    .filter((entry) => LOWER_WORD_RE.test(entry.value) && !CPP_TYPE_SET.has(entry.value))
    .slice(0, 10)
    .map((entry) => ({ value: entry.value, weight: weightOf(entry.count) }));

  const typePrimary = validIdents
    .filter((entry) => TYPE_NAME_RE.test(entry.value))
    .slice(0, 4)
    .map((entry) => ({ value: entry.value, weight: weightOf(entry.count) }));

  const cppTypePrimary = validIdents
    .filter((entry) => CPP_TYPE_SET.has(entry.value))
    .map((entry) => ({ value: entry.value, weight: weightOf(entry.count) }));

  const modPrimary = profile.constants
    .filter((entry) => MOD_VALUE_RE.test(entry.value))
    .map((entry) => ({ value: entry.value, weight: weightOf(entry.count) }));

  const infPrimary = profile.constants
    .filter((entry) => INF_VALUE_RE.test(entry.value))
    .map((entry) => ({ value: entry.value, weight: weightOf(entry.count) }));

  const limitPrimary = profile.constants
    .filter((entry) => LIMIT_VALUE_RE.test(entry.value))
    .map((entry) => ({ value: entry.value, weight: weightOf(entry.count) }));

  const constNamePrimary = profile.constants
    .filter((entry) => CONST_NAME_RE.test(entry.value) && !LIMIT_MACROS.has(entry.value))
    .slice(0, 6)
    .map((entry) => ({ value: entry.value, weight: weightOf(entry.count) }));

  return {
    loopVars: mergePool(loopPrimary, ["i", "j", "k"]),
    shortVars: mergePool(shortPrimary, ["a", "b", "i", "j", "k", "l", "m", "n", "r", "x"]),
    wordVars: mergePool(wordPrimary, ["acc", "ans", "arr", "cnt", "cur", "dp", "pos", "val"]),
    typeNames: mergePool(typePrimary, ["Item", "Node", "Pair"]),
    cppTypes: mergePool([{ value: "int", weight: 50 }, ...cppTypePrimary], ["ll", "i32"]),
    modValues: mergePool(modPrimary, ["1e9 + 7", "998244353"]),
    infValues: mergePool(infPrimary, ["LLONG_MAX", "1e18 + 1000"], 12),
    limitValues: mergePool(limitPrimary, ["2e5 + 100", "200100"]),
    constNames: mergePool(constNamePrimary, ["MAXN", "MOD", "INF"]),
  };
}

const DEFAULT_POOLS = buildProfilePools(DEFAULT_PROFILE);

/** Cached pools for `DEFAULT_PROFILE`, or freshly built pools for a custom profile. */
export function poolsFor(profile: CodegenProfile): ProfilePools {
  return profile === DEFAULT_PROFILE ? DEFAULT_POOLS : buildProfilePools(profile);
}

/** Weighted random choice over a non-empty list with positive weights. */
export function weightedPick<T>(rng: Rng, items: readonly WeightedItem<T>[]): T {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let pick = rng.next() * total;
  let chosen = items[items.length - 1] as WeightedItem<T>;
  for (const item of items) {
    pick -= item.weight;
    if (pick < 0) {
      chosen = item;
      break;
    }
  }
  return chosen.value;
}

/** Weighted random identifier not yet present in `used`, adding the pick to `used`. */
export function pickDistinct(
  rng: Rng,
  items: readonly WeightedItem<string>[],
  used: Set<string>,
): string {
  const available = items.filter((item) => !used.has(item.value));
  const value = weightedPick(rng, available);
  used.add(value);
  return value;
}

/** Grammar rule weight derived from matching `profile.idioms` counts. */
export function idiomWeight(profile: CodegenProfile, patterns: readonly string[]): number {
  let matched = 0;
  for (const entry of profile.idioms) {
    if (patterns.some((pattern) => entry.value.includes(pattern))) {
      matched += entry.count;
    }
  }
  return BASE_RULE_WEIGHT + Math.round(Math.sqrt(matched));
}
