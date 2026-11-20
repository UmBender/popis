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
    if ((commandLevel(name) ?? 8) > level) continue;
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

/** The shortest literal pattern for each distinct set of matches. */
function searchPatterns(lines: readonly string[], maxLength: number): readonly PatternStep[] {
  const byMatches = new Map<string, PatternStep>();
  for (let length = 1; length <= maxLength; length++) {
    for (const text of lines) {
      for (let col = 0; col + length <= text.length; col++) {
        const pattern = text.slice(col, col + length);
        if (REGEX_SPECIAL.test(pattern)) continue;
        const spec = { pattern, startWord: false, endWord: false };
        const key = matchesKey(lines, spec);
        if (!byMatches.has(key)) byMatches.set(key, { spec, id: byMatches.size + 1, length });
      }
    }
  }
  return [...byMatches.values()];
}

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
  const patterns =
    level >= 7 && maxKeys >= 3 ? searchPatterns(lines, Math.min(MAX_PATTERN, maxKeys - 2)) : [];
  const patternIds = new Map<string, number>();
  for (const p of patterns) patternIds.set(matchesKey(lines, p.spec), p.id);
  let nextId = patterns.length + 1;
  const specIds = new Map<string, number>();
  const searchId = (spec: SearchSpec): number => {
    const memo = `${spec.startWord ? "<" : ""}${spec.pattern}${spec.endWord ? ">" : ""}`;
    let id = specIds.get(memo);
    if (id === undefined) {
      const key = matchesKey(lines, spec);
      id = patternIds.get(key);
      if (id === undefined) {
        id = nextId++;
        patternIds.set(key, id);
      }
      specIds.set(memo, id);
    }
    return id;
  };

  /** A number that tells states apart by everything a later key can depend on. */
  const nodeKey = (s: VimState): number => {
    const want = s.curswant === Infinity ? 255 : Math.min(s.curswant, 254);
    const find = s.lastFind === null ? 0 : 1 + KIND_INDEX[s.lastFind.kind] * 256 + s.lastFind.char.charCodeAt(0);
    const search = s.lastSearch === null ? 0 : searchId(s.lastSearch.spec) * 2 + (s.lastSearch.dir === 1 ? 1 : 2);
    return (((s.cursor.line * 256 + s.cursor.col) * 256 + want) * 1100 + find) * 8192 + search;
  };

  const settled = new Map<number, number>();
  const buckets: Node[][] = Array.from({ length: maxKeys + 1 }, () => []);
  const root: Node = { state: start, cost: 0, parent: null, keys: [] };
  buckets[0]?.push(root);
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
    buckets[cost]?.push(node);
  };

  for (let cost = 0; cost < maxKeys; cost++) {
    for (const node of buckets[cost] ?? []) {
      if (settled.get(nodeKey(node.state)) !== cost) continue;
      const budget = maxKeys - cost;
      for (const step of simple) {
        if (step.keys.length > budget) break;
        reach(node, step.command, step.keys);
      }
      if (level >= 4 && budget >= 2) expandFinds(node, budget, level, reach);
      if (level >= 7) {
        for (const p of patterns) {
          if (p.length + 2 > budget) continue;
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

/** `f F t T` with each character that the cursor's line holds in that direction. */
function expandFinds(
  node: Node,
  budget: number,
  level: Level,
  reach: (from: Node, command: Command, keys: readonly Key[]) => void,
): void {
  const { cursor, lines } = node.state;
  const text = lines[cursor.line] as string;
  for (const kind of ["f", "F", "t", "T"] as const) {
    const forward = kind === "f" || kind === "t";
    const seen = new Map<string, number>();
    for (let col = forward ? cursor.col + 1 : cursor.col - 1; col >= 0 && col < text.length; col += forward ? 1 : -1) {
      const char = text.charAt(col);
      seen.set(char, (seen.get(char) ?? 0) + 1);
    }
    for (const [char, occurrences] of seen) {
      reach(node, { name: kind, char, count: null }, [kind, char]);
      if (level < 5 || budget < 3) continue;
      for (let count = 2; count <= Math.min(MAX_COUNT, occurrences); count++) {
        reach(node, { name: kind, char, count }, [digitKey(count), kind, char]);
      }
    }
  }
}
