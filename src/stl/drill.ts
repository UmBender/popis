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
  1: "Nível 1 — Vetor e ordenação",
  2: "Nível 2 — Busca binária e conjuntos",
  3: "Nível 3 — Heap, mapa e pares",
  4: "Nível 4 — Bits, sinal e tipos",
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

export function generateStlItem(
  _seed: number,
  _index: number,
  _level: StlLevel,
  _models?: readonly StlModel[],
): StlItem {
  throw new Error("todo");
}
