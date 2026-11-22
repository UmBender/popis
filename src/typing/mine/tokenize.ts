import { stripComments } from "./normalize";
import type { Language } from "./types";

export type TokenKind = "keyword" | "ident" | "number" | "string" | "op";

export interface Token {
  readonly kind: TokenKind;
  readonly text: string;
}

const CPP_KEYWORDS = new Set([
  "alignas",
  "auto",
  "bool",
  "break",
  "case",
  "catch",
  "char",
  "class",
  "const",
  "constexpr",
  "continue",
  "default",
  "delete",
  "do",
  "double",
  "else",
  "enum",
  "explicit",
  "extern",
  "false",
  "float",
  "for",
  "friend",
  "goto",
  "if",
  "inline",
  "int",
  "int32_t",
  "int64_t",
  "long",
  "mutable",
  "namespace",
  "new",
  "noexcept",
  "nullptr",
  "operator",
  "private",
  "protected",
  "public",
  "return",
  "short",
  "signed",
  "sizeof",
  "size_t",
  "static",
  "struct",
  "switch",
  "template",
  "this",
  "throw",
  "true",
  "try",
  "typedef",
  "typename",
  "uint32_t",
  "uint64_t",
  "union",
  "unsigned",
  "using",
  "virtual",
  "void",
  "while",
  // Preprocessor directive keywords
  "define",
  "ifdef",
  "ifndef",
  "endif",
  "elif",
  "pragma",
  "include",
  "undef",
  // Common C++ standard library names kept stable across variants
  "std",
  "vector",
  "pair",
  "tuple",
  "array",
  "string",
  "set",
  "multiset",
  "map",
  "unordered_map",
  "unordered_set",
  "queue",
  "deque",
  "priority_queue",
  "stack",
  "bitset",
  "cin",
  "cout",
  "cerr",
  "endl",
  "ios",
  "ios_base",
  "sync_with_stdio",
  "tie",
  "min",
  "max",
  "swap",
  "sort",
  "reverse",
  "lower_bound",
  "upper_bound",
  "unique",
  "iota",
  "fill",
  "begin",
  "end",
  "push_back",
  "emplace_back",
  "pop_back",
  "push",
  "pop",
  "front",
  "back",
  "top",
  "empty",
  "size",
  "resize",
  "assign",
  "clear",
  "insert",
  "erase",
  "find",
  "count",
  "first",
  "second",
  "abs",
  "gcd",
  "lcm",
  "sqrt",
  "pow",
  "log2",
  "make_pair",
  "numeric_limits",
  "min_element",
  "max_element",
  "INT_MAX",
  "INT_MIN",
  "LLONG_MAX",
  "LLONG_MIN",
  "INT64_MAX",
]);

const PY_KEYWORDS = new Set([
  "and",
  "as",
  "assert",
  "async",
  "await",
  "break",
  "class",
  "continue",
  "def",
  "del",
  "elif",
  "else",
  "except",
  "False",
  "finally",
  "for",
  "from",
  "global",
  "if",
  "import",
  "in",
  "is",
  "lambda",
  "None",
  "nonlocal",
  "not",
  "or",
  "pass",
  "raise",
  "return",
  "True",
  "try",
  "while",
  "with",
  "yield",
  "int",
  "str",
  "float",
  "bool",
  "list",
  "dict",
  "set",
  "tuple",
  "len",
  "range",
  "min",
  "max",
  "sum",
  "sorted",
  "enumerate",
  "zip",
  "map",
  "filter",
  "input",
  "print",
  "abs",
  "pow",
  "append",
  "pop",
  "popleft",
  "split",
  "deque",
  "defaultdict",
  "heapq",
  "heappush",
  "heappop",
  "bisect",
  "bisect_left",
  "bisect_right",
  "self",
]);

const MULTI_OPS = [
  ">>=",
  "<<=",
  "...",
  "->",
  "::",
  "<=",
  ">=",
  "==",
  "!=",
  "&&",
  "||",
  "++",
  "--",
  "+=",
  "-=",
  "*=",
  "/=",
  "%=",
  "&=",
  "|=",
  "^=",
  "<<",
  ">>",
  "//",
  "**",
];

const NUM_RE = /^(?:0[xXbB][0-9a-fA-F_]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)[uUlLfF]*/;
const IDENT_RE = /^[A-Za-z_]\w*/;

const SPACE_BEFORE_PAREN = new Set(["if", "for", "while", "switch", "catch", "return", "elif"]);
const NO_SPACE_BEFORE = new Set([",", ";", ")", "]", "}", ".", "->", "::", "++", "--"]);
const NO_SPACE_AFTER = new Set(["(", "[", ".", "->", "::", "!", "~", "#"]);

/** Tokenize C++ or Python code after stripping comments. */
export function tokenize(code: string, language: Language): readonly Token[] {
  const src = stripComments(code, language);
  const keywords = language === "cpp" ? CPP_KEYWORDS : PY_KEYWORDS;
  const tokens: Token[] = [];
  let i = 0;

  while (i < src.length) {
    const ch = src.charAt(i);
    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    if (ch === '"' || ch === "'") {
      const triple = language === "python" && src.slice(i, i + 3) === ch.repeat(3);
      const delim = triple ? ch.repeat(3) : ch;
      const start = i;
      i += delim.length;
      while (i < src.length && !src.startsWith(delim, i)) {
        if (src.charAt(i) === "\\") i++;
        i++;
      }
      i += delim.length;
      tokens.push({ kind: "string", text: src.slice(start, Math.min(i, src.length)) });
      continue;
    }

    if (/[0-9]/.test(ch)) {
      const text = NUM_RE.exec(src.slice(i))![0];
      tokens.push({ kind: "number", text });
      i += text.length;
      continue;
    }

    if (/[A-Za-z_]/.test(ch)) {
      const text = IDENT_RE.exec(src.slice(i))![0];
      tokens.push({ kind: keywords.has(text) ? "keyword" : "ident", text });
      i += text.length;
      continue;
    }

    let matchedOp = "";
    for (const op of MULTI_OPS) {
      if (src.startsWith(op, i)) {
        matchedOp = op;
        break;
      }
    }
    const text = matchedOp || ch;
    tokens.push({ kind: "op", text });
    i += text.length;
  }

  return tokens;
}

/** Replace user identifiers with `$0`, `$1`, ... in order of first appearance. */
export function normalizeTokenTexts(tokens: readonly Token[]): readonly string[] {
  const map = new Map<string, string>();
  const out: string[] = [];
  for (const token of tokens) {
    if (token.kind !== "ident") {
      out.push(token.text);
      continue;
    }
    let alias = map.get(token.text);
    if (alias === undefined) {
      alias = `$${map.size}`;
      map.set(token.text, alias);
    }
    out.push(alias);
  }
  return out;
}

function needsSpace(prev: string, curr: string): boolean {
  if (NO_SPACE_BEFORE.has(curr) || NO_SPACE_AFTER.has(prev)) return false;
  if (curr === "(") return SPACE_BEFORE_PAREN.has(prev) || !/^[A-Za-z0-9_$]$/.test(prev.slice(-1));
  if (curr === "[") return false;
  if (prev === "{" && curr === "}") return false;
  return true;
}

/** Format normalized tokens into a single canonical line string for idiom counting. */
export function formatNormalizedTokens(tokens: readonly Token[]): string {
  const normalized = normalizeTokenTexts(tokens);
  const parts: string[] = [];
  for (let i = 0; i < normalized.length; i++) {
    const curr = normalized[i]!;
    if (i > 0 && needsSpace(normalized[i - 1]!, curr)) {
      parts.push(" ");
    }
    parts.push(curr);
  }
  return parts.join("");
}
