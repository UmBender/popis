import { createRng, deriveSeed, type Rng } from "../core/rng";
import { isCodeSymbol } from "../stats/typing-stats";
import { CODE_WORDS } from "./code-words";
import { WORDS } from "./words";

/** Tokens generated per line of weak-spot practice (ADR-T30-1). */
export const WEAK_WORDS_PER_LINE = 6;
/** Minimum occurrences of the focused n-gram in every generated line. */
export const MIN_OCCURRENCES_PER_LINE = 2;

const TARGET_TOKENS_PER_LINE = 4;

const LETTER_POOL: readonly string[] = [...new Set([...WORDS.en, ...CODE_WORDS])];

const CODE_FRAGMENTS: readonly string[] = [
  "push(x);",
  "pop();",
  "sort(v);",
  "dfs(u);",
  "bfs(s);",
  "swap(a,b);",
  "add(x);",
  "find(k);",
  "run(i);",
  "end();",
  "p->next",
  "cur->val",
  "node->left",
  "it->first",
  "it->second",
  "ptr->data",
  "head->prev",
  "u->cost",
  "a[i]",
  "dp[i]",
  "vis[i]",
  "arr[i+1]",
  "cnt[i]",
  "pos[i]",
  "val[i]",
  "dist[i]",
  "sum+=x",
  "ans+=cur",
  "cnt+=1",
  "tot+=val",
  "res+=dp[i]",
  "idx+=step",
  "acc+=w",
  "sum-=x;",
  "prod*=k;",
  "n/=2;",
  "r%=mod;",
  "a==b",
  "x!=0",
  "lo<=hi",
  "hi>=0",
  "ok&&run",
  "a||b",
  "1<<k",
  "x>>1",
  "std::min(a,b)",
  "std::max(x,y)",
  "i++",
  "i--",
  "v[j]",
  "m[k]",
  "s[0]",
  "v.size()",
  "v[i]=0;",
  "a[i]=x;",
  "x&1",
  "x|1",
  "x^y",
  "~mask",
  "!ok",
  "a?b:c",
  "f(x)",
  "g(x,y)",
  "\"ok\"",
  "'a'",
  "#if",
  "@id",
  "k:v",
  "a/b",
  "a*b",
  "a%m",
  "a-b",
  "a+b",
  "n=0",
  "{x,y}",
  "arr[];",
  "fn(){};",
];

const IDENT_PREFIXES = ["", "get", "set", "max", "min", "my", "to"] as const;
const IDENT_SUFFIXES = ["", "id", "val", "key", "len", "pos", "num"] as const;

/** Non-overlapping count of `needle` inside `text`. */
export function countOccurrences(text: string, needle: string): number {
  if (needle.length === 0) return 0;
  let count = 0;
  let pos = 0;
  for (;;) {
    const next = text.indexOf(needle, pos);
    if (next === -1) return count;
    count++;
    pos = next + needle.length;
  }
}

function fallbackToken(ngram: string, symbol: boolean, rng: Rng): string {
  if (symbol) {
    return rng.pick([`x${ngram}y`, `a[${ngram}]`, `fn(${ngram})`, `v${ngram}0`, `p${ngram}q`]);
  }
  return `${rng.pick(IDENT_PREFIXES)}${ngram}${rng.pick(IDENT_SUFFIXES)}`;
}

/** One deterministic line of `WEAK_WORDS_PER_LINE` tokens containing `ngram` at least twice. */
export function generateWeakLine(ngram: string, seed: number): string {
  if (ngram.length === 0 || /\s/.test(ngram)) {
    throw new RangeError("n-gram must be non-empty without whitespace");
  }
  const rng = createRng(seed);
  const symbol = isCodeSymbol(ngram);
  const pool = symbol ? CODE_FRAGMENTS : LETTER_POOL;
  const matches = pool.filter((token) => token.includes(ngram));
  const tokens: string[] = [];
  for (let i = 0; i < TARGET_TOKENS_PER_LINE; i++) {
    tokens.push(matches.length > 0 ? rng.pick(matches) : fallbackToken(ngram, symbol, rng));
  }
  for (let i = TARGET_TOKENS_PER_LINE; i < WEAK_WORDS_PER_LINE; i++) {
    tokens.push(rng.pick(pool));
  }
  for (let i = tokens.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    const tmp = tokens[i] as string;
    tokens[i] = tokens[j] as string;
    tokens[j] = tmp;
  }
  return tokens.join(" ");
}

/** `lineCount` deterministic lines for `ngram`. */
export function generateWeakLines(ngram: string, seed: number, lineCount: number): string[] {
  return Array.from({ length: lineCount }, (_, i) =>
    generateWeakLine(ngram, deriveSeed(seed, i)),
  );
}

/** Space-separated tokens for lines `[startLine, startLine + lineCount)` of `ngram`. */
export function weakWordsFrom(
  ngram: string,
  seed: number,
  startLine: number,
  lineCount: number,
): string[] {
  const words: string[] = [];
  for (let i = 0; i < lineCount; i++) {
    words.push(...generateWeakLine(ngram, deriveSeed(seed, startLine + i)).split(" "));
  }
  return words;
}
