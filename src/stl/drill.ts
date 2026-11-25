import { createRng, deriveSeed, type Rng } from "../core/rng";
import {
  cppDiv,
  cppMod,
  simAccumulateInt,
  simAccumulateU32,
  simBitset,
  simIota,
  simLg,
  simLowerBound,
  simMapOps,
  simMultisetErase,
  simNextPermutation,
  simPopcount,
  simPriorityQueue,
  simReverse,
  simSet,
  simSizeSub,
  simSort,
  simSortPairs,
  simStoi,
  simStringFind,
  simToString,
  simUnique,
  simUpperBound,
  STRING_NPOS,
} from "./sim";

export const STL_LEVELS = [1, 2, 3, 4] as const;

export type StlLevel = (typeof STL_LEVELS)[number];

export const STL_MODELS = [
  "vector_sort",
  "vector_reverse",
  "iota_seq",
  "unique_no_erase",
  "next_perm",
  "lower_bound",
  "upper_bound",
  "set_dedup",
  "multiset_erase",
  "pq_max",
  "map_brackets",
  "pair_order",
  "string_conv",
  "string_find",
  "neg_div_mod",
  "size_t_trap",
  "popcount_lg",
  "bitset_ops",
  "accumulate_int",
] as const;

export type StlModel = (typeof STL_MODELS)[number];

export const STL_LEVEL_MODELS: Readonly<Record<StlLevel, readonly StlModel[]>> = {
  1: ["vector_sort", "vector_reverse", "iota_seq", "unique_no_erase", "next_perm"],
  2: ["lower_bound", "upper_bound", "set_dedup", "multiset_erase"],
  3: ["pq_max", "map_brackets", "pair_order", "string_conv", "string_find"],
  4: ["neg_div_mod", "size_t_trap", "popcount_lg", "bitset_ops", "accumulate_int"],
};

export const STL_LEVEL_LABELS: Readonly<Record<StlLevel, string>> = {
  1: "1 · Vetor e ordenação",
  2: "2 · Busca e conjuntos",
  3: "3 · Heap, mapa e pares",
  4: "4 · Bits, sinal e tipos",
};

export const STL_MODEL_LABELS: Readonly<Record<StlModel, string>> = {
  vector_sort: "sort",
  vector_reverse: "reverse",
  iota_seq: "iota",
  unique_no_erase: "unique sem erase",
  next_perm: "next_permutation",
  lower_bound: "lower_bound",
  upper_bound: "upper_bound",
  set_dedup: "set",
  multiset_erase: "multiset::erase",
  pq_max: "priority_queue",
  map_brackets: "map[k]",
  pair_order: "pair",
  string_conv: "stoi / to_string",
  string_find: "string::find / npos",
  neg_div_mod: "/ e % com negativos",
  size_t_trap: "size() sem sinal",
  popcount_lg: "popcount / __lg",
  bitset_ops: "bitset",
  accumulate_int: "accumulate",
};

export type StlItem = {
  readonly index: number;
  readonly seed: number;
  readonly level: StlLevel;
  readonly model: StlModel;
  readonly kc: `stl.${StlModel}`;
  readonly lines: readonly string[];
  readonly canonical: string;
  readonly boolalpha: boolean;
  readonly explanation: string;
};

type Snippet = {
  readonly lines: readonly string[];
  readonly canonical: string;
  readonly boolalpha: boolean;
  readonly explanation: string;
};

const fmtVec = (v: readonly number[]): string => `{${v.join(", ")}}`;

function distinctInts(rng: Rng, count: number, lo: number, hi: number): number[] {
  const out: number[] = [];
  while (out.length < count) {
    const x = rng.int(lo, hi);
    if (!out.includes(x)) out.push(x);
  }
  return out;
}

function genVectorSort(rng: Rng): Snippet {
  const variant = rng.int(0, 1);
  if (variant === 0) {
    const v = distinctInts(rng, 4, -5, 12);
    const sorted = simSort(v, { desc: true });
    return {
      lines: [
        `vector<int> v = ${fmtVec(v)};`,
        `sort(v.begin(), v.end(), greater<int>());`,
        `for (int x : v) cout << x << ' ';`,
      ],
      canonical: sorted.join(" "),
      boolalpha: false,
      explanation: "sort com greater<int>() ordena o vetor em ordem decrescente.",
    };
  }
  const v = distinctInts(rng, 5, 1, 15);
  const l = rng.int(1, 2);
  const r = rng.int(l + 2, 5);
  const sorted = simSort(v, { from: l, to: r });
  return {
    lines: [
      `vector<int> v = ${fmtVec(v)};`,
      `sort(v.begin() + ${String(l)}, v.begin() + ${String(r)});`,
      `for (int x : v) cout << x << ' ';`,
    ],
    canonical: sorted.join(" "),
    boolalpha: false,
    explanation: `sort(begin + ${String(l)}, begin + ${String(r)}) ordena só o intervalo semi-aberto [${String(l)}, ${String(r)}).`,
  };
}

function genVectorReverse(rng: Rng): Snippet {
  const v = distinctInts(rng, 5, 1, 15);
  const variant = rng.int(0, 1);
  if (variant === 0) {
    const l = rng.int(1, 2);
    const r = rng.int(l + 2, 5);
    const rev = simReverse(v, l, r);
    return {
      lines: [
        `vector<int> v = ${fmtVec(v)};`,
        `reverse(v.begin() + ${String(l)}, v.begin() + ${String(r)});`,
        `for (int x : v) cout << x << ' ';`,
      ],
      canonical: rev.join(" "),
      boolalpha: false,
      explanation: `reverse(begin + ${String(l)}, begin + ${String(r)}) inverte [${String(l)}, ${String(r)}) sem mexer no índice ${String(r)}.`,
    };
  }
  const rev = simReverse(v);
  return {
    lines: [
      `vector<int> v = ${fmtVec(v)};`,
      `reverse(v.begin(), v.end());`,
      `cout << v.front() << ' ' << v.back() << '\\n';`,
    ],
    canonical: `${String(rev[0])} ${String(rev[rev.length - 1])}`,
    boolalpha: false,
    explanation: "reverse inverte toda a sequência: o antigo último vira front() e o primeiro vira back().",
  };
}

function genIotaSeq(rng: Rng): Snippet {
  const n = rng.int(4, 5);
  const start = rng.int(-3, 8);
  const res = simIota(n, start);
  return {
    lines: [
      `vector<int> v(${String(n)});`,
      `iota(v.begin(), v.end(), ${String(start)});`,
      `for (int x : v) cout << x << ' ';`,
    ],
    canonical: res.join(" "),
    boolalpha: false,
    explanation: `iota preenche o vetor somando 1 a cada posição a partir de ${String(start)}.`,
  };
}

function genUniqueNoErase(rng: Rng): Snippet {
  const [a, b, c] = distinctInts(rng, 3, 1, 9) as [number, number, number];
  const v = rng.int(0, 1) === 0 ? [a, a, b, b, a] : [a, b, b, c, c, a];
  const u = simUnique(v);
  return {
    lines: [
      `vector<int> v = ${fmtVec(v)};`,
      `auto it = unique(v.begin(), v.end());`,
      `cout << v.size() << ' ' << (it - v.begin()) << '\\n';`,
    ],
    canonical: `${String(u.size)} ${String(u.uniqueEnd)}`,
    boolalpha: false,
    explanation: "unique só remove duplicatas consecutivas e não muda v.size() sem chamar erase.",
  };
}

function genNextPerm(rng: Rng): Snippet {
  const base = distinctInts(rng, 3, 1, 9).sort((x, y) => x - y);
  const variant = rng.int(0, 2);
  const v =
    variant === 0
      ? base
      : variant === 1
        ? [base[2] as number, base[1] as number, base[0] as number]
        : [base[0] as number, base[2] as number, base[1] as number];
  const res = simNextPermutation(v);
  if (variant === 1 && rng.int(0, 1) === 0) {
    return {
      lines: [
        `vector<int> v = ${fmtVec(v)};`,
        `bool ok = next_permutation(v.begin(), v.end());`,
        `cout << boolalpha << ok << '\\n';`,
      ],
      canonical: res.ok ? "true" : "false",
      boolalpha: true,
      explanation: "Na última permutação (decrescente), next_permutation volta à primeira e devolve false.",
    };
  }
  return {
    lines: [
      `vector<int> v = ${fmtVec(v)};`,
      `bool ok = next_permutation(v.begin(), v.end());`,
      `cout << ok << ' ' << v[0] << ' ' << v[1] << ' ' << v[2] << '\\n';`,
    ],
    canonical: `${res.ok ? "1" : "0"} ${res.values.join(" ")}`,
    boolalpha: false,
    explanation: "next_permutation gera a próxima permutação lexicográfica (ou reinicia em ordem crescente devolvendo 0).",
  };
}

function makeSortedWithDup(rng: Rng): { v: number[]; dup: number } {
  const [a, b, c, d] = distinctInts(rng, 4, -2, 14).sort((x, y) => x - y) as [
    number,
    number,
    number,
    number,
  ];
  return { v: [a, b, b, c, d], dup: b };
}

function genLowerBound(rng: Rng): Snippet {
  const { v, dup } = makeSortedWithDup(rng);
  const kind = rng.int(0, 3);
  const x =
    kind === 0
      ? dup
      : kind === 1
        ? (v[0] as number) - 1
        : kind === 2
          ? (v[v.length - 1] as number) + 2
          : dup + 1;
  const idx = simLowerBound(v, x);
  return {
    lines: [
      `vector<int> v = ${fmtVec(v)};`,
      `auto it = lower_bound(v.begin(), v.end(), ${String(x)});`,
      `cout << (it - v.begin()) << '\\n';`,
    ],
    canonical: String(idx),
    boolalpha: false,
    explanation: "lower_bound devolve o índice do primeiro elemento maior ou igual a x (ou v.size() se não existir).",
  };
}

function genUpperBound(rng: Rng): Snippet {
  const { v, dup } = makeSortedWithDup(rng);
  const variant = rng.int(0, 1);
  if (variant === 0) {
    const x = rng.pick([dup, v[v.length - 1] as number, (v[0] as number) - 1]);
    const idx = simUpperBound(v, x);
    return {
      lines: [
        `vector<int> v = ${fmtVec(v)};`,
        `auto it = upper_bound(v.begin(), v.end(), ${String(x)});`,
        `cout << (it - v.begin()) << '\\n';`,
      ],
      canonical: String(idx),
      boolalpha: false,
      explanation: "upper_bound devolve o primeiro elemento estritamente maior que x.",
    };
  }
  const x = rng.pick([dup, dup + 1]);
  const cnt = simUpperBound(v, x) - simLowerBound(v, x);
  return {
    lines: [
      `vector<int> v = ${fmtVec(v)};`,
      `auto lo = lower_bound(v.begin(), v.end(), ${String(x)});`,
      `auto hi = upper_bound(v.begin(), v.end(), ${String(x)});`,
      `cout << (hi - lo) << '\\n';`,
    ],
    canonical: String(cnt),
    boolalpha: false,
    explanation: "upper_bound - lower_bound conta quantas vezes x aparece no vetor ordenado.",
  };
}

function genSetDedup(rng: Rng): Snippet {
  const [a, b, c] = distinctInts(rng, 3, -5, 12) as [number, number, number];
  const raw = [b, a, c, b, a];
  const s = simSet(raw);
  if (rng.int(0, 1) === 0) {
    return {
      lines: [
        `set<int> s = ${fmtVec(raw)};`,
        `cout << s.size() << ' ' << *s.begin() << ' ' << *s.rbegin() << '\\n';`,
      ],
      canonical: `${String(s.length)} ${String(s[0])} ${String(s[s.length - 1])}`,
      boolalpha: false,
      explanation: "set descarta duplicatas e mantém os elementos ordenados do menor (*begin) ao maior (*rbegin).",
    };
  }
  return {
    lines: [`set<int> s = ${fmtVec(raw)};`, `for (int x : s) cout << x << ' ';`],
    canonical: s.join(" "),
    boolalpha: false,
    explanation: "set remove duplicatas e percorre os elementos em ordem crescente.",
  };
}

function genMultisetErase(rng: Rng): Snippet {
  const [a, b, c] = distinctInts(rng, 3, 1, 10) as [number, number, number];
  const raw = [a, b, b, c, b];
  const byVal = rng.int(0, 1) === 0;
  const after = simMultisetErase(raw, b, byVal ? "value" : "iterator");
  const remCount = after.filter((x) => x === b).length;
  return {
    lines: [
      `multiset<int> ms = ${fmtVec(raw)};`,
      byVal ? `ms.erase(${String(b)});` : `ms.erase(ms.find(${String(b)}));`,
      `cout << ms.size() << ' ' << ms.count(${String(b)}) << '\\n';`,
    ],
    canonical: `${String(after.length)} ${String(remCount)}`,
    boolalpha: false,
    explanation: byVal
      ? "multiset::erase(valor) apaga todas as cópias desse valor."
      : "multiset::erase(ms.find(valor)) apaga apenas uma cópia.",
  };
}

function genPqMax(rng: Rng): Snippet {
  const vals = distinctInts(rng, 4, -4, 18);
  const isMax = rng.int(0, 1) === 0;
  const res = simPriorityQueue(vals, ["pop"], isMax ? "max" : "min");
  return {
    lines: [
      isMax ? `priority_queue<int> pq;` : `priority_queue<int, vector<int>, greater<int>> pq;`,
      `for (int x : ${fmtVec(vals)}) pq.push(x);`,
      `pq.pop();`,
      `cout << pq.top() << ' ' << pq.size() << '\\n';`,
    ],
    canonical: `${String(res.top)} ${String(res.size)}`,
    boolalpha: false,
    explanation: isMax
      ? "priority_queue<int> é max-heap por padrão: pop() remove o maior e top() devolve o segundo maior."
      : "Com greater<int>, priority_queue vira min-heap: pop() remove o menor.",
  };
}

function genMapBrackets(rng: Rng): Snippet {
  const val = rng.int(2, 9);
  const useBrackets = rng.int(0, 1) === 0;
  const res = simMapOps(
    [["a", val]],
    [useBrackets ? { kind: "read", key: "b" } : { kind: "count", key: "b" }],
  );
  return {
    lines: [
      `map<string, int> m;`,
      `m["a"] = ${String(val)};`,
      useBrackets ? `int x = m["b"];` : `int x = m.count("b");`,
      `cout << x << ' ' << m.size() << '\\n';`,
    ],
    canonical: `${String(res.outputs[0])} ${String(res.size)}`,
    boolalpha: false,
    explanation: useBrackets
      ? "Ler m[k] em um map cria a chave k com valor 0 e aumenta m.size()."
      : "m.count(k) consulta sem inserir a chave inexistente no map.",
  };
}

function genPairOrder(rng: Rng): Snippet {
  const [f1, f2] = distinctInts(rng, 2, 1, 6) as [number, number];
  const [s1, s2, s3, s4] = distinctInts(rng, 4, -3, 9) as [number, number, number, number];
  const pairs: readonly (readonly [number, number])[] = [
    [f1, s1],
    [f2, s2],
    [f1, s3],
    [f2, s4],
  ];
  const desc = rng.int(0, 1) === 1;
  const sorted = simSortPairs(pairs, desc);
  const k = rng.int(0, 3);
  const pick = sorted[k] as readonly [number, number];
  const literal = pairs.map(([a, b]) => `{${String(a)}, ${String(b)}}`).join(", ");
  return {
    lines: [
      `vector<pair<int, int>> v = {${literal}};`,
      desc ? `sort(v.begin(), v.end(), greater<>());` : `sort(v.begin(), v.end());`,
      `cout << v[${String(k)}].first << ' ' << v[${String(k)}].second << '\\n';`,
    ],
    canonical: `${String(pick[0])} ${String(pick[1])}`,
    boolalpha: false,
    explanation: "pair compara primeiro por .first e desempata por .second na mesma direção do comparador.",
  };
}

function genStringConv(rng: Rng): Snippet {
  if (rng.int(0, 1) === 0) {
    const a = rng.int(1, 25);
    const b = rng.int(1, 25);
    return {
      lines: [
        `int a = ${String(a)}, b = ${String(b)};`,
        `cout << to_string(a) + to_string(b) << '\\n';`,
      ],
      canonical: simToString(a) + simToString(b),
      boolalpha: false,
      explanation: "to_string converte inteiros em texto, então + concatena os dígitos em vez de somar.",
    };
  }
  const base = rng.int(-15, 25);
  const k = rng.int(1, 9);
  const suffix = rng.pick(["abc", "x9", "px"]);
  const text = `${base >= 0 ? "0" : ""}${String(base)}${suffix}`;
  const out = simStoi(text) + k;
  return {
    lines: [`string s = "${text}";`, `cout << stoi(s) + ${String(k)} << '\\n';`],
    canonical: String(out),
    boolalpha: false,
    explanation: "stoi converte o prefixo numérico em base 10 e para no primeiro caractere que não é dígito.",
  };
}

const WORDS = ["maratona", "algoritmo", "segmento", "banana", "grafo"] as const;

function genStringFind(rng: Rng): Snippet {
  const word = rng.pick(WORDS);
  const variant = rng.int(0, 3);
  if (variant === 0) {
    const start = rng.int(1, word.length - 2);
    const sub = word.slice(start, start + 2);
    const pos = simStringFind(word, sub);
    return {
      lines: [`string s = "${word}";`, `cout << s.find("${sub}") << '\\n';`],
      canonical: String(pos),
      boolalpha: false,
      explanation: "string::find devolve o índice baseado em 0 da primeira ocorrência da substring.",
    };
  }
  const missing = "zz";
  const pos = simStringFind(word, missing);
  if (variant === 1) {
    return {
      lines: [
        `string s = "${word}";`,
        `cout << boolalpha << (s.find("${missing}") == string::npos) << '\\n';`,
      ],
      canonical: pos === STRING_NPOS ? "true" : "false",
      boolalpha: true,
      explanation: "Quando não encontra, string::find devolve string::npos.",
    };
  }
  if (variant === 2) {
    return {
      lines: [`string s = "${word}";`, `cout << (s.find("${missing}") > s.size()) << '\\n';`],
      canonical: pos > BigInt(word.length) ? "1" : "0",
      boolalpha: false,
      explanation: "string::npos é o maior size_t (2^64 - 1), portanto é maior que s.size(), não -1.",
    };
  }
  return {
    lines: [`string s = "${word}";`, `cout << s.find("${missing}") << '\\n';`],
    canonical: String(pos),
    boolalpha: false,
    explanation: "Sem encontrar, string::find imprime string::npos em 64 bits (18446744073709551615), não -1.",
  };
}

function genNegDivMod(rng: Rng): Snippet {
  const absB = rng.int(3, 9);
  const q = rng.int(1, 5);
  const r = rng.int(1, absB - 1);
  const absA = q * absB + r;
  const signCase = rng.int(0, 2);
  const a = signCase === 1 ? absA : -absA;
  const b = signCase === 0 ? absB : -absB;
  return {
    lines: [
      `int a = ${String(a)}, b = ${String(b)};`,
      `cout << a / b << ' ' << a % b << '\\n';`,
    ],
    canonical: `${String(cppDiv(a, b))} ${String(cppMod(a, b))}`,
    boolalpha: false,
    explanation: "Em C++, / trunca em direção a zero e a % b mantém o sinal do dividendo a.",
  };
}

function genSizeTTrap(rng: Rng): Snippet {
  const variant = rng.int(0, 3);
  if (variant === 0 || variant === 1) {
    const len = rng.int(0, 2);
    const vals = simIota(len, 1);
    const k = len + rng.int(1, 3);
    const wrapped = simSizeSub(len, k);
    const gt = wrapped > 10n;
    const useAlpha = variant === 1;
    return {
      lines: [
        len === 0 ? `vector<int> v;` : `vector<int> v = ${fmtVec(vals)};`,
        useAlpha
          ? `cout << boolalpha << (v.size() - ${String(k)} > 10) << '\\n';`
          : `cout << (v.size() - ${String(k)} > 10) << '\\n';`,
      ],
      canonical: useAlpha ? (gt ? "true" : "false") : gt ? "1" : "0",
      boolalpha: useAlpha,
      explanation: "v.size() é size_t (sem sinal), então subtrair além de 0 dá wraparound para perto de 2^64.",
    };
  }
  if (variant === 2) {
    return {
      lines: [`vector<int> v;`, `cout << v.size() - 1 << '\\n';`],
      canonical: String(simSizeSub(0, 1)),
      boolalpha: false,
      explanation: "v.size() é size_t de 64 bits: 0 - 1 vira 2^64 - 1 (18446744073709551615).",
    };
  }
  const len = rng.int(1, 3);
  const vals = simIota(len, 1);
  const k = len + rng.int(1, 4);
  return {
    lines: [
      `vector<int> v = ${fmtVec(vals)};`,
      `cout << ((int)v.size() - ${String(k)}) << '\\n';`,
    ],
    canonical: String(len - k),
    boolalpha: false,
    explanation: "Converter v.size() para int antes da subtração evita o wraparound de size_t.",
  };
}

function genPopcountLg(rng: Rng): Snippet {
  const x = rng.int(1, 63);
  if (rng.int(0, 1) === 0) {
    return {
      lines: [
        `int x = ${String(x)};`,
        `cout << __builtin_popcount(x) << ' ' << __lg(x) << '\\n';`,
      ],
      canonical: `${String(simPopcount(x))} ${String(simLg(x))}`,
      boolalpha: false,
      explanation: "__builtin_popcount conta bits 1 e __lg devolve o índice do bit mais alto (piso de log2).",
    };
  }
  return {
    lines: [`int x = ${String(x)};`, `cout << __lg(x) << '\\n';`],
    canonical: String(simLg(x)),
    boolalpha: false,
    explanation: "__lg(x) devolve floor(log2(x)), o índice baseado em 0 do bit mais significativo.",
  };
}

function genBitsetOps(rng: Rng): Snippet {
  const variant = rng.int(0, 2);
  if (variant === 0) {
    const x = rng.int(1, 31);
    const bit = rng.int(0, 4);
    const b = simBitset(8, x);
    return {
      lines: [
        `bitset<8> b(${String(x)});`,
        `cout << b.count() << ' ' << b[${String(bit)}] << '\\n';`,
      ],
      canonical: `${String(b.count)} ${String(b.test(bit))}`,
      boolalpha: false,
      explanation: "Em bitset, b.count() conta bits 1 e b[i] lê o i-ésimo bit a partir da direita (LSB = 0).",
    };
  }
  if (variant === 1) {
    const x = rng.int(1, 15);
    const bit = rng.int(0, 3);
    const b = simBitset(8, x, [{ kind: "flip", bit }]);
    return {
      lines: [
        `bitset<8> b(${String(x)});`,
        `b.flip(${String(bit)});`,
        `cout << b.to_ulong() << '\\n';`,
      ],
      canonical: String(b.toUlong),
      boolalpha: false,
      explanation: `b.flip(${String(bit)}) inverte o bit 2^${String(bit)} (contando da direita).`,
    };
  }
  const x = rng.int(0, 15);
  const b = simBitset(4, x);
  return {
    lines: [`bitset<4> b(${String(x)});`, `cout << b << '\\n';`],
    canonical: b.toString,
    boolalpha: false,
    explanation: "Imprimir bitset<4> escreve os 4 bits do mais significativo (esquerda) ao menos significativo (direita).",
  };
}

function genAccumulateInt(rng: Rng): Snippet {
  const variant = rng.int(0, 2);
  if (variant === 0) {
    const a = rng.int(0, 3) + 0.5;
    const b = rng.int(0, 3) + 0.5;
    const c = rng.int(0, 2) + 0.5;
    const vals = [a, b, c];
    const sum = simAccumulateInt(vals, 0);
    return {
      lines: [
        `vector<double> v = {${vals.map((n) => n.toFixed(1)).join(", ")}};`,
        `cout << accumulate(v.begin(), v.end(), 0) << '\\n';`,
      ],
      canonical: String(sum),
      boolalpha: false,
      explanation: "O 0 como terceiro argumento fixa o acumulador em int, truncando cada soma parcial.",
    };
  }
  if (variant === 1) {
    const k = rng.int(1, 20);
    const sum = simAccumulateU32([0xffffffff, k], 0);
    return {
      lines: [
        `vector<unsigned> v = {UINT_MAX, ${String(k)}u};`,
        `cout << accumulate(v.begin(), v.end(), 0u) << '\\n';`,
      ],
      canonical: String(sum),
      boolalpha: false,
      explanation: "Com 0u (unsigned de 32 bits), UINT_MAX + k faz wraparound módulo 2^32 e resulta em k - 1.",
    };
  }
  const vals = [rng.int(1, 6), rng.int(1, 6), rng.int(1, 6)];
  const init = rng.int(5, 15);
  const sum = simAccumulateInt(vals, init);
  return {
    lines: [
      `vector<int> v = ${fmtVec(vals)};`,
      `cout << accumulate(v.begin(), v.end(), ${String(init)}) << '\\n';`,
    ],
    canonical: String(sum),
    boolalpha: false,
    explanation: "accumulate começa a soma no terceiro argumento em vez de 0.",
  };
}

const GENERATORS: Readonly<Record<StlModel, (rng: Rng) => Snippet>> = {
  vector_sort: genVectorSort,
  vector_reverse: genVectorReverse,
  iota_seq: genIotaSeq,
  unique_no_erase: genUniqueNoErase,
  next_perm: genNextPerm,
  lower_bound: genLowerBound,
  upper_bound: genUpperBound,
  set_dedup: genSetDedup,
  multiset_erase: genMultisetErase,
  pq_max: genPqMax,
  map_brackets: genMapBrackets,
  pair_order: genPairOrder,
  string_conv: genStringConv,
  string_find: genStringFind,
  neg_div_mod: genNegDivMod,
  size_t_trap: genSizeTTrap,
  popcount_lg: genPopcountLg,
  bitset_ops: genBitsetOps,
  accumulate_int: genAccumulateInt,
};

/** Deterministically generates the `index`-th STL output item for `seed` and `level`. */
export function generateStlItem(
  seed: number,
  index: number,
  level: StlLevel,
  models?: readonly StlModel[],
): StlItem {
  const itemSeed = deriveSeed(seed, index);
  const rng = createRng(itemSeed);
  const pool = models !== undefined && models.length > 0 ? models : STL_LEVEL_MODELS[level];
  const model = rng.pick(pool);
  const snippet = GENERATORS[model](rng);
  return {
    index,
    seed: itemSeed,
    level,
    model,
    kc: `stl.${model}`,
    lines: snippet.lines,
    canonical: snippet.canonical,
    boolalpha: snippet.boolalpha,
    explanation: snippet.explanation,
  };
}
