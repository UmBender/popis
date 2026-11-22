import { createRng, deriveSeed, type Rng } from "../../core/rng";
import type { Language } from "../corpus";
import {
  DEFAULT_PROFILE,
  idiomWeight,
  pickDistinct,
  poolsFor,
  weightedPick,
} from "./profile";
import type {
  BurstRule,
  BurstSnippet,
  BurstSummary,
  CodegenProfile,
  ProfilePools,
} from "./types";

export const BURST_REPETITIONS = 5 as const;

const CPP_BURST_RULES: readonly BurstRule[] = [
  {
    name: "for-loop",
    patterns: ["for (int", "for (auto"],
    generate: (rng: Rng, pools: ProfilePools) => {
      const used = new Set<string>();
      const i = pickDistinct(rng, pools.loopVars, used);
      const n = pickDistinct(rng, pools.shortVars, used);
      const variant = rng.int(0, 2);
      if (variant === 0) return `for (int ${i} = 0; ${i} < ${n}; ${i}++) {`;
      if (variant === 1) return `for (int ${i} = 1; ${i} <= ${n}; ${i}++) {`;
      return `for (int ${i} = ${n} - 1; ${i} >= 0; ${i}--) {`;
    },
  },
  {
    name: "cin-read",
    patterns: ["cin >>"],
    generate: (rng: Rng, pools: ProfilePools) => {
      const used = new Set<string>();
      const x = pickDistinct(rng, pools.shortVars, used);
      const arr = pickDistinct(rng, pools.wordVars, used);
      return `for (auto &${x} : ${arr}) cin >> ${x};`;
    },
  },
  {
    name: "vector-sized",
    patterns: ["vector <"],
    generate: (rng: Rng, pools: ProfilePools) => {
      const used = new Set<string>();
      const n = pickDistinct(rng, pools.shortVars, used);
      const arr = pickDistinct(rng, pools.wordVars, used);
      const t = weightedPick(rng, pools.cppTypes);
      const init = rng.int(0, 1) === 0 ? "0" : "-1";
      return `vector<${t}> ${arr}(${n} + 1, ${init});`;
    },
  },
  {
    name: "prefix-sum",
    patterns: ["+= $1["],
    generate: (rng: Rng, pools: ProfilePools) => {
      const used = new Set<string>();
      const i = pickDistinct(rng, pools.loopVars, used);
      const a = pickDistinct(rng, pools.shortVars, used);
      const pref = pickDistinct(rng, pools.wordVars, used);
      return `${pref}[${i} + 1] = ${pref}[${i}] + ${a}[${i}];`;
    },
  },
  {
    name: "sort-lambda",
    patterns: ["sort("],
    generate: (rng: Rng, pools: ProfilePools) => {
      const used = new Set<string>();
      const x = pickDistinct(rng, pools.shortVars, used);
      const y = pickDistinct(rng, pools.shortVars, used);
      const arr = pickDistinct(rng, pools.wordVars, used);
      return `sort(${arr}.begin(), ${arr}.end(), [](pii ${x}, pii ${y}) {`;
    },
  },
  {
    name: "lower-bound",
    patterns: ["lower_bound"],
    generate: (rng: Rng, pools: ProfilePools) => {
      const used = new Set<string>();
      const a = pickDistinct(rng, pools.shortVars, used);
      const x = pickDistinct(rng, pools.shortVars, used);
      return `auto it = lower_bound(${a}.begin(), ${a}.end(), ${x});`;
    },
  },
  {
    name: "pair-struct",
    patterns: ["struct ", "pair <"],
    generate: (rng: Rng, pools: ProfilePools) => {
      const used = new Set<string>();
      const a = pickDistinct(rng, pools.shortVars, used);
      const b = pickDistinct(rng, pools.shortVars, used);
      const arr = pickDistinct(rng, pools.wordVars, used);
      return `pair<int, int> ${arr} = {${a}, ${b}};`;
    },
  },
  {
    name: "binary-search",
    patterns: ["while ($0 <= $1)", "/ 2;"],
    generate: (rng: Rng, pools: ProfilePools) => {
      const used = new Set<string>();
      const l = pickDistinct(rng, pools.shortVars, used);
      const r = pickDistinct(rng, pools.shortVars, used);
      const mid = pickDistinct(rng, pools.wordVars, used);
      return `int ${mid} = ${l} + (${r} - ${l}) / 2;`;
    },
  },
  {
    name: "constants",
    patterns: ["#define", "using $0 ="],
    generate: (rng: Rng, pools: ProfilePools) => {
      const modVal = weightedPick(rng, pools.modValues);
      return `const ll MOD = ${modVal};`;
    },
  },
  {
    name: "structured-binding",
    patterns: ["for (auto", "pair <"],
    generate: (rng: Rng, pools: ProfilePools) => {
      const used = new Set<string>();
      const a = pickDistinct(rng, pools.shortVars, used);
      const b = pickDistinct(rng, pools.shortVars, used);
      const arr = pickDistinct(rng, pools.wordVars, used);
      return `for (auto [${a}, ${b}] : ${arr}) {`;
    },
  },
];

const PYTHON_BURST_RULES: readonly BurstRule[] = [
  {
    name: "py-for-range",
    patterns: ["range("],
    generate: (rng: Rng, pools: ProfilePools) => {
      const used = new Set<string>();
      const i = pickDistinct(rng, pools.loopVars, used);
      const n = pickDistinct(rng, pools.shortVars, used);
      return rng.int(0, 1) === 0
        ? `for ${i} in range(1, ${n} + 1):`
        : `for ${i} in range(${n} - 1, -1, -1):`;
    },
  },
  {
    name: "py-input-split",
    patterns: ["input()"],
    generate: (rng: Rng, pools: ProfilePools) => {
      const used = new Set<string>();
      const a = pickDistinct(rng, pools.shortVars, used);
      return `${a} = list(map(int, input().split()))`;
    },
  },
  {
    name: "py-list-comp",
    patterns: ["for "],
    generate: (rng: Rng, pools: ProfilePools) => {
      const used = new Set<string>();
      const n = pickDistinct(rng, pools.shortVars, used);
      const m = pickDistinct(rng, pools.shortVars, used);
      const res = pickDistinct(rng, pools.wordVars, used);
      return `${res} = [[0] * ${m} for _ in range(${n})]`;
    },
  },
  {
    name: "py-defaultdict",
    patterns: ["defaultdict"],
    generate: (rng: Rng, pools: ProfilePools) => {
      const used = new Set<string>();
      const g = pickDistinct(rng, pools.wordVars, used);
      return `${g} = defaultdict(list)`;
    },
  },
  {
    name: "py-sorted-key",
    patterns: ["sorted("],
    generate: (rng: Rng, pools: ProfilePools) => {
      const used = new Set<string>();
      const arr = pickDistinct(rng, pools.wordVars, used);
      const res = pickDistinct(rng, pools.wordVars, used);
      return `${res} = sorted(${arr}, key=lambda p: (p[0], -p[1]))`;
    },
  },
  {
    name: "py-bisect",
    patterns: ["bisect"],
    generate: (rng: Rng, pools: ProfilePools) => {
      const used = new Set<string>();
      const a = pickDistinct(rng, pools.shortVars, used);
      const x = pickDistinct(rng, pools.shortVars, used);
      const pos = pickDistinct(rng, pools.wordVars, used);
      return `${pos} = bisect_left(${a}, ${x})`;
    },
  },
  {
    name: "py-heapq",
    patterns: ["heapq"],
    generate: (rng: Rng, pools: ProfilePools) => {
      const used = new Set<string>();
      const a = pickDistinct(rng, pools.shortVars, used);
      const b = pickDistinct(rng, pools.shortVars, used);
      const h = pickDistinct(rng, pools.wordVars, used);
      return `heapq.heappush(${h}, (${a}, ${b}))`;
    },
  },
];

/** Generates a 5-repetition Rajada burst for `seed` and `languages` (T31 AC-5). */
export function generateBurst(
  seed: number,
  languages: readonly Language[],
  profile: CodegenProfile = DEFAULT_PROFILE,
): BurstSnippet {
  if (languages.length === 0) throw new RangeError("choose at least one language");
  const language = createRng(seed).pick(languages);
  const rng = createRng(deriveSeed(seed, 1));
  const pools = poolsFor(profile);
  const rules = language === "cpp" ? CPP_BURST_RULES : PYTHON_BURST_RULES;
  const weighted = rules.map((rule) => ({
    value: rule,
    weight: idiomWeight(profile, rule.patterns),
  }));
  const rule = weightedPick(rng, weighted);
  const idiom = rule.generate(rng, pools);
  const text = Array.from({ length: BURST_REPETITIONS }, () => idiom).join("\n");
  return {
    id: `burst:${language}:${rule.name}:${String(seed)}`,
    language,
    seed,
    rule: rule.name,
    idiom,
    text,
    repetitions: BURST_REPETITIONS,
  };
}

/** Summarises repetition durations and the ratio between the last and first repetition. */
export function burstSummary(timesMs: readonly number[]): BurstSummary {
  const first = timesMs[0];
  const last = timesMs[timesMs.length - 1];
  const ratio = first !== undefined && last !== undefined && first > 0 ? last / first : null;
  return { timesMs: [...timesMs], ratio };
}
