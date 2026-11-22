import { createRng, type Rng } from "../../core/rng";
import {
  DEFAULT_PROFILE,
  idiomWeight,
  pickDistinct,
  poolsFor,
  weightedPick,
} from "./profile";
import type { CodegenProfile, GeneratedSnippet, GrammarRule, ProfilePools } from "./types";

export const PYTHON_RULE_NAMES = [
  "py-for-range",
  "py-input-split",
  "py-list-comp",
  "py-defaultdict",
  "py-sorted-key",
  "py-bisect",
  "py-heapq",
] as const;

function pyForRangeRule(rng: Rng, pools: ProfilePools): string {
  const used = new Set<string>();
  const i = pickDistinct(rng, pools.loopVars, used);
  const n = pickDistinct(rng, pools.shortVars, used);
  const acc = pickDistinct(rng, pools.wordVars, used);
  const sz = rng.int(5, 25);
  const k = rng.int(2, 7);
  const variant = rng.int(0, 2);

  const header =
    variant === 0
      ? `for ${i} in range(${n}):`
      : variant === 1
        ? `for ${i} in range(1, ${n} + 1):`
        : `for ${i} in range(${n} - 1, -1, -1):`;

  return [
    `${n} = ${String(sz)}`,
    `${acc} = 0`,
    header,
    `    ${acc} += ${i} * ${String(k)}`,
    `print(${acc})`,
  ].join("\n");
}

function pyInputSplitRule(rng: Rng, pools: ProfilePools): string {
  const used = new Set<string>();
  const n = pickDistinct(rng, pools.shortVars, used);
  const m = pickDistinct(rng, pools.shortVars, used);
  const a = pickDistinct(rng, pools.shortVars, used);
  const acc = pickDistinct(rng, pools.wordVars, used);

  return [
    `${n}, ${m} = map(int, input().split())`,
    `${a} = list(map(int, input().split()))`,
    `${acc} = sum(${a}[:${m}]) + ${n}`,
    `print(${acc})`,
  ].join("\n");
}

function pyListCompRule(rng: Rng, pools: ProfilePools): string {
  const used = new Set<string>();
  const a = pickDistinct(rng, pools.shortVars, used);
  const x = pickDistinct(rng, pools.shortVars, used);
  const n = pickDistinct(rng, pools.shortVars, used);
  const m = pickDistinct(rng, pools.shortVars, used);
  const res = pickDistinct(rng, pools.wordVars, used);
  const k = rng.int(2, 6);

  if (rng.int(0, 1) === 0) {
    const v1 = rng.int(1, 9);
    const v2 = rng.int(1, 5);
    const v3 = rng.int(2, 9);
    const v4 = rng.int(1, 8);
    return [
      `${a} = [${String(v1)}, -${String(v2)}, ${String(v3)}, ${String(v4)}]`,
      `${res} = [${x} * ${String(k)} for ${x} in ${a} if ${x} > 0]`,
      `print(len(${res}))`,
    ].join("\n");
  }
  const rows = rng.int(3, 8);
  const cols = rng.int(3, 8);
  return [
    `${n}, ${m} = ${String(rows)}, ${String(cols)}`,
    `${res} = [[0] * ${m} for _ in range(${n})]`,
    `${res}[0][0] = ${String(k)}`,
    `print(${res}[0][0])`,
  ].join("\n");
}

function pyDefaultdictRule(rng: Rng, pools: ProfilePools): string {
  const used = new Set<string>();
  const i = pickDistinct(rng, pools.loopVars, used);
  const g = pickDistinct(rng, pools.wordVars, used);
  const sz = rng.int(4, 12);
  const step = rng.int(1, 4);

  if (rng.int(0, 1) === 0) {
    return [
      "from collections import defaultdict",
      `${g} = defaultdict(list)`,
      `for ${i} in range(${String(sz)}):`,
      `    ${g}[${i}].append(${i} + ${String(step)})`,
      `print(len(${g}))`,
    ].join("\n");
  }
  return [
    "from collections import defaultdict",
    `${g} = defaultdict(int)`,
    `for ${i} in range(${String(sz)}):`,
    `    ${g}[${i} % ${String(step + 1)}] += 1`,
    `print(len(${g}))`,
  ].join("\n");
}

function pySortedKeyRule(rng: Rng, pools: ProfilePools): string {
  const used = new Set<string>();
  const arr = pickDistinct(rng, pools.wordVars, used);
  const res = pickDistinct(rng, pools.wordVars, used);
  const v1 = rng.int(1, 9);
  const v2 = rng.int(1, 9);
  const v3 = rng.int(1, 9);
  const v4 = rng.int(1, 9);

  return [
    `${arr} = [(${String(v1)}, ${String(v2)}), (${String(v3)}, ${String(v4)})]`,
    `${res} = sorted(${arr}, key=lambda p: (p[0], -p[1]))`,
    `print(${res}[0])`,
  ].join("\n");
}

function pyBisectRule(rng: Rng, pools: ProfilePools): string {
  const used = new Set<string>();
  const a = pickDistinct(rng, pools.shortVars, used);
  const x = pickDistinct(rng, pools.shortVars, used);
  const pos = pickDistinct(rng, pools.wordVars, used);
  const base = rng.int(1, 6);
  const step = rng.int(2, 5);
  const vals = [base, base + step, base + 2 * step, base + 3 * step];

  return [
    "from bisect import bisect_left",
    `${a} = [${vals.map(String).join(", ")}]`,
    `${x} = ${String(base + step + 1)}`,
    `${pos} = bisect_left(${a}, ${x})`,
    `print(${pos})`,
  ].join("\n");
}

function pyHeapqRule(rng: Rng, pools: ProfilePools): string {
  const used = new Set<string>();
  const i = pickDistinct(rng, pools.loopVars, used);
  const a = pickDistinct(rng, pools.shortVars, used);
  const b = pickDistinct(rng, pools.shortVars, used);
  const h = pickDistinct(rng, pools.wordVars, used);
  const sz = rng.int(3, 9);
  const k = rng.int(2, 5);

  return [
    "import heapq",
    `${h} = []`,
    `for ${i} in range(${String(sz)}):`,
    `    heapq.heappush(${h}, (${i} * ${String(k)}, ${i}))`,
    `${a}, ${b} = heapq.heappop(${h})`,
    `print(${a}, ${b})`,
  ].join("\n");
}

const PYTHON_RULES: readonly GrammarRule[] = [
  { name: "py-for-range", patterns: ["range("], generate: pyForRangeRule },
  { name: "py-input-split", patterns: ["input()"], generate: pyInputSplitRule },
  { name: "py-list-comp", patterns: ["for "], generate: pyListCompRule },
  { name: "py-defaultdict", patterns: ["defaultdict"], generate: pyDefaultdictRule },
  { name: "py-sorted-key", patterns: ["sorted("], generate: pySortedKeyRule },
  { name: "py-bisect", patterns: ["bisect"], generate: pyBisectRule },
  { name: "py-heapq", patterns: ["heapq"], generate: pyHeapqRule },
];

/** Generates a deterministic Python snippet from `seed` weighted by `profile`. */
export function generatePython(
  seed: number,
  profile: CodegenProfile = DEFAULT_PROFILE,
): GeneratedSnippet {
  const rng = createRng(seed);
  const pools = poolsFor(profile);
  const weighted = PYTHON_RULES.map((rule) => ({
    value: rule,
    weight: idiomWeight(profile, rule.patterns),
  }));
  const rule = weightedPick(rng, weighted);
  return {
    id: `gen:python:${String(seed)}`,
    language: "python",
    seed,
    rule: rule.name,
    text: rule.generate(rng, pools),
  };
}
