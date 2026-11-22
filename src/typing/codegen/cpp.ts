import { createRng, type Rng } from "../../core/rng";
import { DEFAULT_PROFILE, idiomWeight, pickDistinct, poolsFor, weightedPick } from "./profile";
import type { CodegenProfile, GeneratedSnippet, GrammarRule, ProfilePools } from "./types";

export const CPP_RULE_NAMES = [
  "for-loop",
  "cin-read",
  "vector-sized",
  "prefix-sum",
  "sort-lambda",
  "lower-bound",
  "pair-struct",
  "binary-search",
  "constants",
  "structured-binding",
] as const;

function forLoopRule(rng: Rng, pools: ProfilePools): string {
  const used = new Set<string>();
  const i = pickDistinct(rng, pools.loopVars, used);
  const n = pickDistinct(rng, pools.shortVars, used);
  const a = pickDistinct(rng, pools.shortVars, used);
  const acc = pickDistinct(rng, pools.wordVars, used);
  const t = weightedPick(rng, pools.cppTypes);
  const sz = rng.int(4, 24);
  const k = rng.int(2, 9);
  const c = rng.int(1, 7);
  const variant = rng.int(0, 2);

  if (variant === 0) {
    return [
      `int ${n} = ${String(sz)};`,
      `vector<${t}> ${a}(${n}, 0);`,
      `${t} ${acc} = 0;`,
      `for (int ${i} = 0; ${i} < ${n}; ${i}++) {`,
      `    ${a}[${i}] = ${i} * ${String(k)} + ${String(c)};`,
      `    ${acc} += ${a}[${i}];`,
      "}",
    ].join("\n");
  }
  if (variant === 1) {
    return [
      `int ${n} = ${String(sz)};`,
      `vector<${t}> ${a}(${n} + 1, 0);`,
      `${t} ${acc} = 0;`,
      `for (int ${i} = 1; ${i} <= ${n}; ${i}++) {`,
      `    ${a}[${i}] = ${a}[${i} - 1] + ${i};`,
      `    ${acc} += ${a}[${i}];`,
      "}",
    ].join("\n");
  }
  return [
    `int ${n} = ${String(sz)};`,
    `vi ${a}(${n}, ${String(c)});`,
    `int ${acc} = 0;`,
    `for (int ${i} = ${n} - 1; ${i} >= 0; ${i}--) {`,
    `    ${acc} += ${a}[${i}] * (${i} + 1);`,
    "}",
  ].join("\n");
}

function cinReadRule(rng: Rng, pools: ProfilePools): string {
  const used = new Set<string>();
  const i = pickDistinct(rng, pools.loopVars, used);
  const n = pickDistinct(rng, pools.shortVars, used);
  const m = pickDistinct(rng, pools.shortVars, used);
  const x = pickDistinct(rng, pools.shortVars, used);
  const arr = pickDistinct(rng, pools.wordVars, used);
  const acc = pickDistinct(rng, pools.wordVars, used);
  const t = weightedPick(rng, pools.cppTypes);

  if (rng.int(0, 1) === 0) {
    return [
      `int ${n};`,
      `cin >> ${n};`,
      `vector<${t}> ${arr}(${n});`,
      `for (auto &${x} : ${arr}) {`,
      `    cin >> ${x};`,
      "}",
      `${t} ${acc} = 0;`,
      `for (auto ${x} : ${arr}) ${acc} += ${x};`,
    ].join("\n");
  }
  return [
    `int ${n}, ${m};`,
    `cin >> ${n} >> ${m};`,
    `vector<${t}> ${arr}(${n});`,
    `for (int ${i} = 0; ${i} < ${n}; ${i}++) {`,
    `    cin >> ${arr}[${i}];`,
    "}",
    `cout << ${arr}[0] + ${m} << '\\n';`,
  ].join("\n");
}

function vectorSizedRule(rng: Rng, pools: ProfilePools): string {
  const used = new Set<string>();
  const i = pickDistinct(rng, pools.loopVars, used);
  const j = pickDistinct(rng, pools.loopVars, used);
  const n = pickDistinct(rng, pools.shortVars, used);
  const m = pickDistinct(rng, pools.shortVars, used);
  const g = pickDistinct(rng, pools.shortVars, used);
  const acc = pickDistinct(rng, pools.wordVars, used);
  const t = weightedPick(rng, pools.cppTypes);
  const rows = rng.int(3, 12);
  const cols = rng.int(3, 12);
  const val = rng.int(1, 15);

  if (rng.int(0, 1) === 0) {
    return [
      `int ${n} = ${String(rows)}, ${m} = ${String(cols)};`,
      `vector<vi> ${g}(${n} + 1, vi(${m} + 1, 0));`,
      `for (int ${i} = 1; ${i} <= ${n}; ${i}++) {`,
      `    for (int ${j} = 1; ${j} <= ${m}; ${j}++) {`,
      `        ${g}[${i}][${j}] = ${g}[${i} - 1][${j}] + ${String(val)};`,
      "    }",
      "}",
    ].join("\n");
  }
  return [
    `int ${n} = ${String(rows)};`,
    `vector<${t}> ${g}(${n}, ${String(val)});`,
    `${g}.push_back(${String(val + cols)});`,
    `${t} ${acc} = ${g}[0];`,
    `for (int ${i} = 1; ${i} < ${n}; ${i}++) {`,
    `    ${acc} = max(${acc}, ${g}[${i}]);`,
    "}",
  ].join("\n");
}

function prefixSumRule(rng: Rng, pools: ProfilePools): string {
  const used = new Set<string>();
  const i = pickDistinct(rng, pools.loopVars, used);
  const n = pickDistinct(rng, pools.shortVars, used);
  const a = pickDistinct(rng, pools.shortVars, used);
  const l = pickDistinct(rng, pools.shortVars, used);
  const r = pickDistinct(rng, pools.shortVars, used);
  const pref = pickDistinct(rng, pools.wordVars, used);
  const acc = pickDistinct(rng, pools.wordVars, used);
  const t = weightedPick(rng, pools.cppTypes);
  const sz = rng.int(6, 20);
  const v0 = rng.int(1, 9);
  const lo = rng.int(0, 2);
  const hi = rng.int(lo + 2, sz);

  return [
    `int ${n} = ${String(sz)};`,
    `vector<${t}> ${a}(${n}, ${String(v0)});`,
    `vector<${t}> ${pref}(${n} + 1, 0);`,
    `for (int ${i} = 0; ${i} < ${n}; ${i}++) {`,
    `    ${pref}[${i} + 1] = ${pref}[${i}] + ${a}[${i}];`,
    "}",
    `int ${l} = ${String(lo)}, ${r} = ${String(hi)};`,
    `${t} ${acc} = ${pref}[${r}] - ${pref}[${l}];`,
  ].join("\n");
}

function sortLambdaRule(rng: Rng, pools: ProfilePools): string {
  const used = new Set<string>();
  const n = pickDistinct(rng, pools.shortVars, used);
  const x = pickDistinct(rng, pools.shortVars, used);
  const y = pickDistinct(rng, pools.shortVars, used);
  const arr = pickDistinct(rng, pools.wordVars, used);
  const t = weightedPick(rng, pools.cppTypes);
  const sz = rng.int(4, 12);
  const v1 = rng.int(1, 9);
  const v2 = rng.int(1, 9);

  if (rng.int(0, 1) === 0) {
    return [
      `int ${n} = ${String(sz)};`,
      `vector<pii> ${arr}(${n}, {${String(v1)}, ${String(v2)}});`,
      `sort(${arr}.begin(), ${arr}.end(), [](pii ${x}, pii ${y}) {`,
      `    if (${x}.first != ${y}.first) {`,
      `        return ${x}.first < ${y}.first;`,
      "    }",
      `    return ${x}.second > ${y}.second;`,
      "});",
    ].join("\n");
  }
  return [
    `vector<${t}> ${arr}(${String(sz)}, ${String(v1)});`,
    `sort(${arr}.begin(), ${arr}.end(), [](${t} ${x}, ${t} ${y}) {`,
    `    return ${x} > ${y};`,
    "});",
  ].join("\n");
}

function lowerBoundRule(rng: Rng, pools: ProfilePools): string {
  const used = new Set<string>();
  const n = pickDistinct(rng, pools.shortVars, used);
  const a = pickDistinct(rng, pools.shortVars, used);
  const x = pickDistinct(rng, pools.shortVars, used);
  const pos = pickDistinct(rng, pools.wordVars, used);
  const t = weightedPick(rng, pools.cppTypes);
  const sz = rng.int(5, 18);
  const base = rng.int(1, 8);
  const step = rng.int(2, 6);

  if (rng.int(0, 1) === 0) {
    return [
      `int ${n} = ${String(sz)};`,
      `vector<${t}> ${a}(${n}, ${String(base)});`,
      `sort(${a}.begin(), ${a}.end());`,
      `${t} ${x} = ${String(base + step)};`,
      `auto it = lower_bound(${a}.begin(), ${a}.end(), ${x});`,
      `int ${pos} = (int)(it - ${a}.begin());`,
    ].join("\n");
  }
  return [
    `vector<${t}> ${a} = {${String(base)}, ${String(base + step)}, ${String(base + 2 * step)}};`,
    `${t} ${x} = ${String(base + step - 1)};`,
    `auto it = lower_bound(${a}.begin(), ${a}.end(), ${x});`,
    `int ${pos} = (int)(it - ${a}.begin());`,
    `if (it != ${a}.end()) {`,
    `    ${pos} += 1;`,
    "}",
  ].join("\n");
}

function pairStructRule(rng: Rng, pools: ProfilePools): string {
  const used = new Set<string>();
  const name = pickDistinct(rng, pools.typeNames, used);
  const i = pickDistinct(rng, pools.loopVars, used);
  const f1 = pickDistinct(rng, pools.shortVars, used);
  const f2 = pickDistinct(rng, pools.shortVars, used);
  const arr = pickDistinct(rng, pools.wordVars, used);
  const acc = pickDistinct(rng, pools.wordVars, used);
  const t = weightedPick(rng, pools.cppTypes);
  const sz = rng.int(3, 10);
  const v1 = rng.int(1, 9);
  const v2 = rng.int(1, 9);

  if (rng.int(0, 1) === 0) {
    return [
      `struct ${name} {`,
      `    int ${f1};`,
      `    int ${f2};`,
      "};",
      `vector<${name}> ${arr}(${String(sz)}, {${String(v1)}, ${String(v2)}});`,
      `int ${acc} = 0;`,
      `for (int ${i} = 0; ${i} < ${String(sz)}; ${i}++) {`,
      `    ${acc} += ${arr}[${i}].${f1} + ${arr}[${i}].${f2};`,
      "}",
    ].join("\n");
  }
  return [
    `struct ${name} {`,
    `    pii ${f1};`,
    `    ${t} ${f2};`,
    "};",
    `pair<int, int> ${arr} = {${String(v1)}, ${String(v2)}};`,
    `${name} ${acc} = {${arr}, ${String(v1 + v2)}};`,
    `int ${i} = ${acc}.${f1}.first + ${acc}.${f1}.second;`,
  ].join("\n");
}

function binarySearchRule(rng: Rng, pools: ProfilePools): string {
  const used = new Set<string>();
  const n = pickDistinct(rng, pools.shortVars, used);
  const a = pickDistinct(rng, pools.shortVars, used);
  const x = pickDistinct(rng, pools.shortVars, used);
  const l = pickDistinct(rng, pools.shortVars, used);
  const r = pickDistinct(rng, pools.shortVars, used);
  const mid = pickDistinct(rng, pools.wordVars, used);
  const ans = pickDistinct(rng, pools.wordVars, used);
  const sz = rng.int(8, 32);
  const target = rng.int(1, 20);

  return [
    `int ${n} = ${String(sz)}, ${x} = ${String(target)};`,
    `vi ${a}(${n}, 0);`,
    `int ${l} = 0, ${r} = ${n} - 1, ${ans} = -1;`,
    `while (${l} <= ${r}) {`,
    `    int ${mid} = ${l} + (${r} - ${l}) / 2;`,
    `    if (${a}[${mid}] >= ${x}) {`,
    `        ${ans} = ${mid};`,
    `        ${r} = ${mid} - 1;`,
    "    } else {",
    `        ${l} = ${mid} + 1;`,
    "    }",
    "}",
  ].join("\n");
}

function constantsRule(rng: Rng, pools: ProfilePools): string {
  const used = new Set<string>();
  const i = pickDistinct(rng, pools.loopVars, used);
  const n = pickDistinct(rng, pools.shortVars, used);
  const x = pickDistinct(rng, pools.shortVars, used);
  const acc = pickDistinct(rng, pools.wordVars, used);
  const modVal = weightedPick(rng, pools.modValues);
  const infVal = weightedPick(rng, pools.infValues);
  const limVal = weightedPick(rng, pools.limitValues);
  const cName = pickDistinct(rng, pools.constNames, used);
  const sz = rng.int(5, 16);
  const mul = rng.int(2, 19);
  const variant = rng.int(0, 2);

  if (variant === 0) {
    return [
      "#define int ll",
      `const int MOD = ${modVal};`,
      `int ${n} = ${String(sz)}, ${acc} = 1;`,
      `for (int ${i} = 1; ${i} <= ${n}; ${i}++) {`,
      `    ${acc} = (${acc} * ${i}) % MOD;`,
      "}",
    ].join("\n");
  }
  if (variant === 1) {
    return [
      `const int MAXN = ${limVal};`,
      `const ll MOD = ${modVal};`,
      `ll ${acc} = ${infVal};`,
      `ll ${x} = (MAXN + ${String(mul)}) % MOD;`,
      `${acc} = min(${acc}, ${x});`,
    ].join("\n");
  }
  const modName = cName === "MOD" ? "P" : "MOD";
  return [
    `const ll ${cName} = ${infVal};`,
    `const ll ${modName} = ${modVal};`,
    `ll ${acc} = ${cName};`,
    `ll ${x} = (${String(sz)}LL * ${String(mul)}) % ${modName};`,
    `${acc} = min(${acc}, ${x});`,
  ].join("\n");
}

function structuredBindingRule(rng: Rng, pools: ProfilePools): string {
  const used = new Set<string>();
  const a = pickDistinct(rng, pools.shortVars, used);
  const b = pickDistinct(rng, pools.shortVars, used);
  const p = pickDistinct(rng, pools.shortVars, used);
  const arr = pickDistinct(rng, pools.wordVars, used);
  const acc = pickDistinct(rng, pools.wordVars, used);
  const v1 = rng.int(1, 9);
  const v2 = rng.int(1, 9);
  const v3 = rng.int(1, 9);
  const v4 = rng.int(1, 9);

  if (rng.int(0, 1) === 0) {
    return [
      `vector<pii> ${arr} = {{${String(v1)}, ${String(v2)}}, {${String(v3)}, ${String(v4)}}};`,
      `ll ${acc} = 0;`,
      `for (auto [${a}, ${b}] : ${arr}) {`,
      `    ${acc} += (ll)${a} * ${b};`,
      "}",
    ].join("\n");
  }
  return [
    `pii ${p} = {${String(v1)}, ${String(v2)}};`,
    `auto [${a}, ${b}] = ${p};`,
    `int ${acc} = ${a} + ${b};`,
    `if (${a} < ${b}) {`,
    `    ${acc} = ${b} - ${a};`,
    "}",
  ].join("\n");
}

const CPP_RULES: readonly GrammarRule[] = [
  { name: "for-loop", patterns: ["for (int", "for (auto"], generate: forLoopRule },
  { name: "cin-read", patterns: ["cin >>"], generate: cinReadRule },
  { name: "vector-sized", patterns: ["vector <"], generate: vectorSizedRule },
  { name: "prefix-sum", patterns: ["+= $1["], generate: prefixSumRule },
  { name: "sort-lambda", patterns: ["sort("], generate: sortLambdaRule },
  { name: "lower-bound", patterns: ["lower_bound"], generate: lowerBoundRule },
  { name: "pair-struct", patterns: ["struct ", "pair <"], generate: pairStructRule },
  { name: "binary-search", patterns: ["while ($0 <= $1)", "/ 2;"], generate: binarySearchRule },
  { name: "constants", patterns: ["#define", "using $0 ="], generate: constantsRule },
  {
    name: "structured-binding",
    patterns: ["for (auto", "pair <"],
    generate: structuredBindingRule,
  },
];

/** Generates a deterministic C++20 snippet from `seed` weighted by `profile`. */
export function generateCpp(
  seed: number,
  profile: CodegenProfile = DEFAULT_PROFILE,
): GeneratedSnippet {
  const rng = createRng(seed);
  const pools = poolsFor(profile);
  const weighted = CPP_RULES.map((rule) => ({
    value: rule,
    weight: idiomWeight(profile, rule.patterns),
  }));
  const rule = weightedPick(rng, weighted);
  return {
    id: `gen:cpp:${String(seed)}`,
    language: "cpp",
    seed,
    rule: rule.name,
    text: rule.generate(rng, pools),
  };
}
