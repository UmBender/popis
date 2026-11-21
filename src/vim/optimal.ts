import { formatKeys, type Key } from "./keys";
import { commandLevel, type Level } from "./levels";
import { execute, searchMatches, type Command, type SimpleName } from "./motions";
import type { FindKind, Pos, SearchSpec, VimState } from "./state";

export type Solution = {
  /** The keys in Vim notation, such as "f(" or "/ab<CR>". */
  readonly keys: string;
  /** The number of keys; each key is 1. */
  readonly cost: number;
};

const DEFAULT_MAX_KEYS = 6;
const MAX_COUNT = 9;
const MAX_PATTERN = 3;
/** Characters that mean something in a Vim pattern, so a search for them is not literal. */
const REGEX_SPECIAL = /[\\/?.*[\]~^$]/;

const SIMPLE_NAMES: readonly SimpleName[] = [
  ...(["h", "j", "k", "l", "w", "b", "e", "W", "B", "E", "ge"] as const),
  ...(["0", "^", "$", ";", ",", "gg", "G", "{", "}", "%", "n", "N", "*", "#"] as const),
];
/** `0` is a movement by itself and `^` ignores its count. */
const NO_COUNT = new Set<string>(["0", "^"]);

/** A command with the keys that type it. */
type Step = { readonly command: Command; readonly keys: readonly Key[] };

const digitKey = (n: number): Key => String(n);

/** The movements that need no argument, with their counts 2 to 9 on level 5 and up. */
function simpleSteps(level: Level): readonly Step[] {
  const steps: Step[] = [];
  for (const name of SIMPLE_NAMES) {
    if ((commandLevel(name) as Level) > level) continue;
    const keys = [...name];
    steps.push({ command: { name, count: null }, keys });
    if (level < 5 || NO_COUNT.has(name)) continue;
    for (let count = 2; count <= MAX_COUNT; count++) {
      steps.push({ command: { name, count }, keys: [digitKey(count), ...keys] });
    }
  }
  return steps.sort((a, b) => a.keys.length - b.keys.length);
}

/** A literal pattern that matches the same places as the others, with its keys. */
type PatternStep = { readonly spec: SearchSpec; readonly id: number; readonly length: number };

/** The patterns of a buffer, and the id of each distinct set of matches. */
type PatternSet = {
  readonly patterns: readonly PatternStep[];
  readonly byMatches: ReadonlyMap<string, number>;
};

const NO_PATTERNS: PatternSet = { patterns: [], byMatches: new Map() };

/** The shortest literal pattern for each distinct set of matches. */
function searchPatterns(lines: readonly string[], maxLength: number): PatternSet {
  let byLength = patternCache.get(lines);
  if (byLength === undefined) {
    byLength = new Map();
    patternCache.set(lines, byLength);
  }
  const cached = byLength.get(maxLength);
  if (cached !== undefined) return cached;

  const byMatches = new Map<string, PatternStep>();
  const seen = new Set<string>();
  for (let length = 1; length <= maxLength; length++) {
    for (const text of lines) {
      for (let col = 0; col + length <= text.length; col++) {
        const pattern = text.slice(col, col + length);
        if (seen.has(pattern) || REGEX_SPECIAL.test(pattern)) continue;
        seen.add(pattern);
        const spec = { pattern, startWord: false, endWord: false };
        const key = matchesKey(lines, spec);
        if (!byMatches.has(key)) byMatches.set(key, { spec, id: byMatches.size + 1, length });
      }
    }
  }
  const set: PatternSet = {
    patterns: [...byMatches.values()],
    byMatches: new Map([...byMatches].map(([key, p]) => [key, p.id])),
  };
  byLength.set(maxLength, set);
  return set;
}

/** The patterns of a buffer by maximum length; buffers are never mutated. */
const patternCache = new WeakMap<readonly string[], Map<number, PatternSet>>();

const matchesKey = (lines: readonly string[], spec: SearchSpec): string =>
  searchMatches(lines, spec)
    .map((m) => m.line * 1000 + m.col)
    .join(",");

/** One node of the search: a state reached at a cost, and how. */
type Node = {
  readonly state: VimState;
  readonly cost: number;
  readonly parent: Node | null;
  readonly keys: readonly Key[];
};

const KIND_INDEX: Readonly<Record<FindKind, number>> = { f: 0, F: 1, t: 2, T: 3 };

/** The fewest keys that take the cursor to `target`, or null when more than `maxKeys`. */
export function optimalSolution(
  start: VimState,
  target: Pos,
  level: Level,
  maxKeys: number = DEFAULT_MAX_KEYS,
): Solution | null {
  const { lines } = start;
  const isTarget = (s: VimState) => s.cursor.line === target.line && s.cursor.col === target.col;
  if (isTarget(start)) return { keys: "", cost: 0 };

  const simple = simpleSteps(level);
  const patternLength = Math.min(MAX_PATTERN, maxKeys - 2);
  const { patterns, byMatches } =
    level >= 7 && patternLength >= 1 ? searchPatterns(lines, patternLength) : NO_PATTERNS;
  // Searches of `*` and `#` can match where no pattern of the list does.
  const extraIds = new Map<string, number>();
  const specIds = new WeakMap<SearchSpec, number>();
  const searchId = (spec: SearchSpec): number => {
    let id = specIds.get(spec);
    if (id === undefined) {
      const key = matchesKey(lines, spec);
      id = byMatches.get(key) ?? extraIds.get(key);
      if (id === undefined) {
        id = patterns.length + extraIds.size + 1;
        extraIds.set(key, id);
      }
      specIds.set(spec, id);
    }
    return id;
  };
  // A search that ends the path must land on the target, so it must match
  // there: its pattern is the text that starts at the target.
  const matchesTarget = new Set<number>();
  const targetText = lines[target.line] as string;
  for (let length = 1; level >= 7 && length <= patternLength; length++) {
    const pattern = targetText.slice(target.col, target.col + length);
    const id = byMatches.get(matchesKey(lines, { pattern, startWord: false, endWord: false }));
    if (id !== undefined) matchesTarget.add(id);
  }

  /** A number that tells states apart by everything a later key can depend on. */
  const nodeKey = (s: VimState): number => {
    const want = s.curswant === Infinity ? 255 : Math.min(s.curswant, 254);
    const find =
      s.lastFind === null
        ? 0
        : 1 + KIND_INDEX[s.lastFind.kind] * 256 + s.lastFind.char.charCodeAt(0);
    const search =
      s.lastSearch === null
        ? 0
        : searchId(s.lastSearch.spec) * 2 + (s.lastSearch.dir === 1 ? 1 : 2);
    return (((s.cursor.line * 256 + s.cursor.col) * 256 + want) * 1100 + find) * 8192 + search;
  };

  const settled = new Map<number, number>();
  const buckets: Node[][] = Array.from({ length: maxKeys + 1 }, () => []);
  const root: Node = { state: start, cost: 0, parent: null, keys: [] };
  (buckets[0] as Node[]).push(root);
  settled.set(nodeKey(start), 0);
  let best: Node | null = null;

  const reach = (from: Node, command: Command, keys: readonly Key[]): void => {
    const cost = from.cost + keys.length;
    if (cost > maxKeys || (best !== null && cost >= best.cost)) return;
    const state = execute(from.state, command);
    const node: Node = { state, cost, parent: from, keys };
    if (isTarget(state)) {
      best = node;
      return;
    }
    // A node at the limit cannot be extended, so only the target matters.
    if (cost === maxKeys) return;
    const key = nodeKey(state);
    const known = settled.get(key);
    if (known !== undefined && known <= cost) return;
    settled.set(key, cost);
    (buckets[cost] as Node[]).push(node);
  };

  for (let cost = 0; cost < maxKeys; cost++) {
    for (const node of buckets[cost] as Node[]) {
      if (settled.get(nodeKey(node.state)) !== cost) continue;
      const limit = best !== null ? Math.min(maxKeys, (best as Node).cost - 1) : maxKeys;
      const budget = limit - cost;
      if (budget <= 0) continue;
      for (const step of simple) {
        if (step.keys.length > budget) break;
        reach(node, step.command, step.keys);
      }
      if (level >= 4 && budget >= 2) expandFinds(node, budget, level, target, reach);
      if (level >= 7) {
        const searchLimit = best !== null ? Math.min(maxKeys, (best as Node).cost - 1) : maxKeys;
        const searchBudget = searchLimit - cost;
        for (const p of patterns) {
          const length = p.length + 2;
          if (length > searchBudget || (length === searchBudget && !matchesTarget.has(p.id)))
            continue;
          const keys = [..."/"].concat([...p.spec.pattern], ["<CR>"]);
          reach(node, { name: "/", pattern: p.spec.pattern, count: null }, keys);
          reach(node, { name: "?", pattern: p.spec.pattern, count: null }, ["?", ...keys.slice(1)]);
        }
      }
    }
    // Nothing found later can cost less than what is already found.
    if (best !== null && (best as Node).cost <= cost + 1) break;
  }

  const found = best as Node | null;
  if (found === null) return null;
  const keys: Key[] = [];
  for (let n: Node | null = found; n !== null; n = n.parent) keys.unshift(...n.keys);
  return { keys: formatKeys(keys), cost: found.cost };
}

/** Shortest literal `/` or `?` search that lands directly on `target` in one command, or null. */
function directSearch(start: VimState, target: Pos, maxKeys: number): Solution | null {
  const text = start.lines[target.line] as string;
  const maxLen = Math.min(MAX_PATTERN, maxKeys - 2);
  for (let len = 1; len <= maxLen && target.col + len <= text.length; len++) {
    const pattern = text.slice(target.col, target.col + len);
    if (REGEX_SPECIAL.test(pattern)) continue;
    for (const dir of ["/", "?"] as const) {
      const next = execute(start, { name: dir, pattern, count: null });
      if (next.cursor.line === target.line && next.cursor.col === target.col) {
        const keys = [dir, ...pattern, "<CR>"];
        return { keys: formatKeys(keys), cost: keys.length };
      }
    }
  }
  return null;
}

/** Direct level-valid fallback path when `target` is farther than the BFS bound. */
function directPath(start: VimState, target: Pos, level: Level): Solution {
  const keys: Key[] = [];
  let cur = start;

  const dy = target.line - cur.cursor.line;
  if (dy !== 0) {
    const absY = Math.abs(dy);
    const dir: SimpleName = dy > 0 ? "j" : "k";
    if (level >= 6 && absY > 2) {
      if (target.line === 0) {
        keys.push("g", "g");
        cur = execute(cur, { name: "gg", count: null });
      } else if (target.line === cur.lines.length - 1) {
        keys.push("G");
        cur = execute(cur, { name: "G", count: null });
      } else {
        const lineNum = target.line + 1;
        keys.push(...String(lineNum), "G");
        cur = execute(cur, { name: "G", count: lineNum });
      }
    } else if (level >= 5 && absY > 1) {
      keys.push(...String(absY), dir);
      cur = execute(cur, { name: dir, count: absY });
    } else {
      for (let i = 0; i < absY; i++) {
        keys.push(dir);
        cur = execute(cur, { name: dir, count: null });
      }
    }
  }

  const dx = target.col - cur.cursor.col;
  if (dx !== 0) {
    const absX = Math.abs(dx);
    const dir: SimpleName = dx > 0 ? "l" : "h";
    if (level >= 3 && target.col === 0) {
      keys.push("0");
    } else if (level >= 5 && absX > 1) {
      keys.push(...String(absX), dir);
    } else {
      for (let i = 0; i < absX; i++) keys.push(dir);
    }
  }

  return { keys: formatKeys(keys), cost: keys.length };
}

/** Recalculates an optimal (or bounded fallback) path from any state to `target` (T21 AC-2, AC-3). */
export function recalculateOptimal(
  state: VimState,
  target: Pos,
  level: Level,
  maxKeys: number = DEFAULT_MAX_KEYS,
): Solution {
  const clean = state.pending.length === 0 ? state : { ...state, pending: [] };
  if (clean.cursor.line === target.line && clean.cursor.col === target.col) {
    return { keys: "", cost: 0 };
  }
  // Progressive deepening keeps level-7 recalculation well under 16 ms.
  const firstBound = Math.min(level >= 7 ? 3 : 4, maxKeys);
  const quick = optimalSolution(clean, target, level, firstBound);
  if (quick !== null) return quick;

  if (level >= 7) {
    const search = directSearch(clean, target, maxKeys);
    const searchBound = search !== null ? Math.min(maxKeys, search.cost - 1) : maxKeys;
    const med =
      searchBound >= 4 ? optimalSolution(clean, target, 7, Math.min(4, searchBound)) : null;
    if (med !== null) return med;
    const noSearch =
      searchBound >= 5 ? optimalSolution(clean, target, 6, searchBound) : null;
    if (noSearch !== null) return noSearch;
    if (search !== null) return search;
  } else if (maxKeys > firstBound) {
    const deeper = optimalSolution(clean, target, level, maxKeys);
    if (deeper !== null) return deeper;
  }

  return directPath(clean, target, level);
}

/** `f F t T` with each character that the cursor's line holds in that direction. */
function expandFinds(
  node: Node,
  budget: number,
  level: Level,
  target: Pos,
  reach: (from: Node, command: Command, keys: readonly Key[]) => void,
): void {
  const { cursor, lines } = node.state;
  const text = lines[cursor.line] as string;
  // A find that ends the path must land on the target: the character it
  // looks for is the one on the target (f, F), after it (t) or before it (T).
  const onLine = target.line === cursor.line;
  const wanted = {
    f: text.charAt(target.col),
    F: text.charAt(target.col),
    t: text.charAt(target.col + 1),
    T: text.charAt(target.col - 1),
  };
  for (const kind of ["f", "F", "t", "T"] as const) {
    const forward = kind === "f" || kind === "t";
    const seen = new Map<string, number>();
    for (
      let col = forward ? cursor.col + 1 : cursor.col - 1;
      col >= 0 && col < text.length;
      col += forward ? 1 : -1
    ) {
      const char = text.charAt(col);
      seen.set(char, (seen.get(char) ?? 0) + 1);
    }
    for (const [char, occurrences] of seen) {
      const last = onLine && char === wanted[kind];
      if (budget > 2 || last) reach(node, { name: kind, char, count: null }, [kind, char]);
      if (level < 5 || budget < 3 || (budget === 3 && !last)) continue;
      for (let count = 2; count <= Math.min(MAX_COUNT, occurrences); count++) {
        reach(node, { name: kind, char, count }, [digitKey(count), kind, char]);
      }
    }
  }
}
