import { detectLanguage, normalizeSnippet, stripComments, validateSnippetRules } from "./normalize";
import { normalizeTokenTexts, tokenize } from "./tokenize";
import type { ExtractedItem, ExtractedKind, Language, RepoFile } from "./types";

const MIN_LINES = 4;
const MAX_LINES = 150;
const MIN_TOKENS = 10;

const SHORT_NAME_ALIASES: Readonly<Record<string, string>> = {
  fenwick: "fenwick",
  fenwicktree: "fenwick",
  bit: "fenwick",
  binaryindexedtree: "fenwick",
  rangefenwick: "range_fenwick",
  dsu: "dsu",
  unionfind: "dsu",
  uf: "dsu",
  disjointset: "dsu",
  segtree: "segtree",
  segmenttree: "segtree",
  st: "segtree",
  lazysegtree: "lazy_segtree",
  lazysegmenttree: "lazy_segtree",
  mergesorttree: "merge_sort_tree",
  sieve: "sieve",
  linearsieve: "sieve",
  scc: "scc",
  tarjan: "scc",
  bs: "binary_search",
  bsl: "binary_search",
  bsu: "binary_search",
  binarysearch: "binary_search",
  bfs: "bfs",
  dfs: "dfs",
  dijkstra: "dijkstra",
  bl: "binary_lifting",
  binarylifting: "binary_lifting",
  lca: "binary_lifting",
  sparsetable: "sparse_table",
  treap: "treap",
  trie: "trie",
  kmp: "kmp",
  buildpi: "kmp",
  buildpis: "kmp",
  prefixfunction: "kmp",
  fastexp: "fast_exp",
  binpow: "fast_exp",
  modpow: "fast_exp",
  fexp: "fast_exp",
  inv: "mod_inv",
  modinv: "mod_inv",
  comb: "comb",
  ncr: "comb",
  matrix: "matrix",
  mat: "matrix",
  mint: "modint",
  modint: "modint",
  treediameter: "tree_diameter",
  cartesiantree: "cartesian_tree",
  eulertour: "euler_tour",
  eulertourarray: "euler_tour",
  dfsarray: "dfs_array",
  ternarysearch: "ternary_search",
  monoidstack: "monoid_stack",
  heapsort: "heap_sort",
};

const SKIP_CPP_FUNCTIONS = new Set([
  "main",
  "solve",
  "solution",
  "_dbg",
  "__dbg",
  "debug",
  "setIO",
  "PRINT",
  "print",
  "test",
  "teste",
  "op",
  "e",
  "max",
  "min",
  "top",
  "te",
  "cmp",
]);

const SKIP_PY_FUNCTIONS = new Set(["main", "__main__"]);

const CPP_STRUCT_RE = /^(?:template\s*<[^>]*>\s*)?(?:struct|class)\s+([A-Za-z_]\w*)\b/;
const CPP_LAMBDA_RE = /^\s*auto\s+([A-Za-z_]\w*)\s*=\s*\[[^\]]*\]\s*\(/;
const CPP_WHILE_RE = /^\s*while\s*\((.+)\)\s*\{/;
const CPP_SKIP_TOP_RE = /^(?:#|using\b|typedef\b|namespace\b|enum\b|if\b|for\b|while\b|switch\b|else\b|return\b|do\b)/;

/** Map a struct, class, or function identifier to a short canonical snippet name. */
export function toShortName(rawName: string): string {
  const collapsed = rawName.toLowerCase().replace(/[^a-z0-9]/g, "");
  const alias = SHORT_NAME_ALIASES[collapsed];
  if (alias) return alias;
  return rawName
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

function scanBraceDelta(line: string): { open: number; close: number; delta: number } {
  let open = 0;
  let close = 0;
  let inQuote = "";
  for (let i = 0; i < line.length; i++) {
    const ch = line.charAt(i);
    if (inQuote) {
      if (ch === "\\") i++;
      else if (ch === inQuote) inQuote = "";
      continue;
    }
    if (ch === '"' || ch === "'") {
      inQuote = ch;
    } else if (ch === "{") {
      open++;
    } else if (ch === "}") {
      close++;
    }
  }
  return { open, close, delta: open - close };
}

function findBlockEnd(lines: readonly string[], startLine: number): number {
  let depth = 0;
  let seenOpen = false;
  for (let i = startLine; i < lines.length; i++) {
    const { open, close } = scanBraceDelta(lines[i]!);
    if (open > 0) seenOpen = true;
    depth += open - close;
    if (seenOpen && depth <= 0) return i;
  }
  return -1;
}

function extractCppFnName(line: string): string | null {
  const withoutTemplate = line.replace(/^template\s*<[^>]*>\s*/, "");
  const parenIdx = withoutTemplate.indexOf("(");
  if (parenIdx <= 0) return null;
  const beforeParen = withoutTemplate.slice(0, parenIdx).trim();
  const match = /\b([A-Za-z_]\w*)$/.exec(beforeParen);
  return match ? match[1]! : null;
}

function makeItem(
  file: RepoFile,
  language: Language,
  kind: ExtractedKind,
  rawName: string,
  rawCode: string,
): ExtractedItem | null {
  const code = normalizeSnippet(rawCode, language);
  if (!validateSnippetRules(code).ok) return null;
  const nonEmpty = code.split("\n").filter((l) => l.trim().length > 0).length;
  if (nonEmpty < MIN_LINES || nonEmpty > MAX_LINES) return null;
  const tokens = normalizeTokenTexts(tokenize(code, language));
  if (tokens.length < MIN_TOKENS) return null;
  const shortName = toShortName(rawName);
  return {
    kind,
    rawName,
    shortName,
    language,
    code,
    tokens,
    path: file.path,
    createdAt: file.createdAt,
  };
}

function extractCppItems(file: RepoFile): ExtractedItem[] {
  const lines = stripComments(file.content, "cpp").replace(/\t/g, "    ").split("\n");
  const out: ExtractedItem[] = [];
  let depth = 0;
  let templateStart = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const trimmed = line.trim();

    if (depth === 0) {
      if (trimmed.length === 0) {
        templateStart = -1;
      } else if (/^template\s*</.test(trimmed) && !trimmed.includes("{") && !trimmed.includes(";")) {
        if (templateStart < 0) templateStart = i;
      } else {
        const structMatch = CPP_STRUCT_RE.exec(trimmed);
        if (structMatch && !trimmed.endsWith(";")) {
          const declStart = templateStart >= 0 ? templateStart : i;
          const end = findBlockEnd(lines, i);
          templateStart = -1;
          if (end >= i) {
            const rawStruct = lines.slice(declStart, end + 1).join("\n");
            // Skip pure data-only POD structs with no constructor or method.
            if (rawStruct.includes("(")) {
              const item = makeItem(file, "cpp", "struct", structMatch[1]!, rawStruct);
              if (item) out.push(item);
            }
            i = end;
            continue;
          }
        } else if (!CPP_SKIP_TOP_RE.test(trimmed) && trimmed.includes("(") && trimmed.includes("{")) {
          const fnName = extractCppFnName(trimmed);
          const declStart = templateStart >= 0 ? templateStart : i;
          templateStart = -1;
          if (fnName && !SKIP_CPP_FUNCTIONS.has(fnName)) {
            const end = findBlockEnd(lines, i);
            if (end >= i) {
              const item = makeItem(
                file,
                "cpp",
                "function",
                fnName,
                lines.slice(declStart, end + 1).join("\n"),
              );
              if (item) out.push(item);
              i = end;
              continue;
            }
          }
        } else {
          templateStart = -1;
        }
      }
    }

    if (depth > 0) {
      const lambdaMatch = CPP_LAMBDA_RE.exec(line);
      if (lambdaMatch && line.includes("{")) {
        const end = findBlockEnd(lines, i);
        if (end >= i) {
          const item = makeItem(
            file,
            "cpp",
            "lambda",
            lambdaMatch[1]!,
            lines.slice(i, end + 1).join("\n"),
          );
          if (item) out.push(item);
        }
      }

      const whileMatch = CPP_WHILE_RE.exec(line);
      if (whileMatch) {
        const end = findBlockEnd(lines, i);
        if (end >= i) {
          const cond = whileMatch[1]!;
          const block = lines.slice(i, end + 1).join("\n");
          const isBfs =
            /(?:empty|size)\s*\(\s*\)/.test(cond) &&
            block.includes(".front()") &&
            block.includes(".pop()") &&
            block.includes(".push(");
          const isBinarySearch =
            !block.includes(".front()") &&
            /[<>]=?|!=/.test(cond) &&
            /(?:\/\s*2|>>\s*1)/.test(block);
          if (isBfs || isBinarySearch) {
            const role = isBfs ? "bfs" : "binary_search";
            const item = makeItem(file, "cpp", "loop", role, block);
            if (item) out.push(item);
          }
        }
      }
    }

    depth += scanBraceDelta(line).delta;
    if (depth < 0) depth = 0;
  }

  return out;
}

function extractPyBlockEnd(lines: readonly string[], startLine: number): number {
  const baseIndent = lines[startLine]!.length - lines[startLine]!.trimStart().length;
  let end = startLine;
  for (let i = startLine + 1; i < lines.length; i++) {
    const line = lines[i]!;
    if (line.trim().length === 0) continue;
    const indent = line.length - line.trimStart().length;
    if (indent <= baseIndent) break;
    end = i;
  }
  return end;
}

function extractPyItems(file: RepoFile): ExtractedItem[] {
  const lines = stripComments(file.content, "python").replace(/\t/g, "    ").split("\n");
  const out: ExtractedItem[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const indent = line.length - line.trimStart().length;
    const trimmed = line.trim();

    if (indent === 0) {
      const classMatch = /^class\s+([A-Za-z_]\w*)/.exec(trimmed);
      if (classMatch) {
        const end = extractPyBlockEnd(lines, i);
        const item = makeItem(
          file,
          "python",
          "struct",
          classMatch[1]!,
          lines.slice(i, end + 1).join("\n"),
        );
        if (item) out.push(item);
        i = end;
        continue;
      }

      const defMatch = /^def\s+([A-Za-z_]\w*)\s*\(/.exec(trimmed);
      if (defMatch && !SKIP_PY_FUNCTIONS.has(defMatch[1]!)) {
        const end = extractPyBlockEnd(lines, i);
        const item = makeItem(
          file,
          "python",
          "function",
          defMatch[1]!,
          lines.slice(i, end + 1).join("\n"),
        );
        if (item) out.push(item);
        i = end;
        continue;
      }
    }

    if (/^while\s+.+:/.test(trimmed)) {
      const end = extractPyBlockEnd(lines, i);
      const block = lines.slice(i, end + 1).join("\n");
      const isBfs = block.includes(".popleft()") && block.includes(".append(");
      const isBinarySearch = /(?:\/\/\s*2|>>\s*1)/.test(block);
      if (isBfs || isBinarySearch) {
        const item = makeItem(file, "python", "loop", isBfs ? "bfs" : "binary_search", block);
        if (item) out.push(item);
      }
    }
  }

  return out;
}

/** Extract top-level structs, functions, named lambdas, and known-role loops from source files. */
export function extractItems(files: readonly RepoFile[]): readonly ExtractedItem[] {
  const items: ExtractedItem[] = [];
  for (const file of files) {
    const lang = detectLanguage(file.path);
    if (lang === "cpp") items.push(...extractCppItems(file));
    else if (lang === "python") items.push(...extractPyItems(file));
  }
  return items;
}
