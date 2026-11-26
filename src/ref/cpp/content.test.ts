import { describe, expect, it } from "vitest";
import { entriesOf, sectionsOf } from "../langs";
import { refLink } from "../link";

// T46 AC-3 / T50 AC-1..AC-2: the C++ content covers all sections of the notes in short entries.

const ENTRIES = entriesOf("cpp");
const byId = new Map(ENTRIES.map((e) => [e.id, e]));

/** The minimum entries listed in the task note, by id. */
const MINIMUM: Readonly<Record<string, readonly string[]>> = {
  io: [
    "bits_stdcpp",
    "sync_with_stdio",
    "cin_tie",
    "endl",
    "read_until_eof",
    "getline_after_extract",
    "setprecision",
    "printf_lld",
  ],
  types: [
    "int",
    "long_long",
    "int128",
    "unsigned",
    "long_double",
    "llong_max",
    "shift_1ll",
    "numeric_limits",
  ],
  containers: [
    "vector",
    "vector_2d",
    "array",
    "deque",
    "stack",
    "queue",
    "priority_queue",
    "priority_queue_min",
    "set",
    "map",
    "unordered_map",
    "bitset",
    "pair_tuple",
    "structured_bindings",
  ],
  algorithms: [
    "sort",
    "stable_sort",
    "lower_bound",
    "upper_bound",
    "set_lower_bound",
    "binary_search",
    "unique_erase",
    "next_permutation",
    "reverse",
    "accumulate",
    "partial_sum",
    "iota",
    "min_max_element",
    "nth_element",
    "count",
    "fill",
    "memset",
  ],
  strings: [
    "substr",
    "find",
    "stoi_stoll",
    "to_string",
    "string_fill",
    "string_append",
    "stringstream",
  ],
  bits: ["popcount", "clz", "ctz", "lg", "bit_width", "submasks"],
  math: ["gcd", "lcm", "powmod", "modinv", "mod_negative", "isqrt", "ceil_div"],
  random: ["mt19937", "uniform_int_distribution", "shuffle", "time_cutoff"],
  pb_ds: ["ordered_set", "gp_hash_table"],
  extras: ["pragma_optimize", "assert", "glibcxx_debug", "regex"],
};

/** The new entries listed in the T50 task note, by section and id. */
const MINIMUM_T50: Readonly<Record<string, readonly string[]>> = {
  pb_ds: [
    "ordered_set",
    "ordered_map",
    "ordered_multiset",
    "pbds_split_join",
    "pbds_trie",
    "pbds_priority_queue",
    "cc_hash_table",
    "gp_hash_table",
    "gp_hash_table_hash",
  ],
  gnu: [
    "rope",
    "bitset_find_first",
    "builtin_parity_ffs",
    "builtin_expect",
    "print_int128",
    "pragma_target",
    "builtin_overflow",
  ],
  strings: ["boyer_moore_searcher", "kmp", "z_function", "string_view", "from_chars_to_chars"],
  algorithms: [
    "partition_point",
    "equal_range",
    "includes",
    "rotate",
    "merge",
    "inplace_merge",
    "set_operations",
    "adjacent_difference",
    "inclusive_exclusive_scan",
    "is_sorted",
    "minmax_element",
    "prev_permutation",
    "stable_partition",
    "all_any_none_of",
    "transform",
    "ranges_projection",
  ],
  containers: [
    "node_extract_merge",
    "contains_erase_if",
    "try_emplace",
    "unordered_reserve",
    "multiset_erase_one",
    "list_splice",
    "complex_point",
    "exchange",
    "tie_tuple_cmp",
    "ssize",
    "ctad",
    "span",
  ],
  bits: [
    "std_popcount",
    "countl_zero",
    "countr_zero",
    "bit_ceil_floor",
    "has_single_bit",
    "rotl_rotr",
  ],
  math: ["midpoint", "clamp", "gcd_vs_builtin_gcd", "lcm_overflow"],
  extras: ["dbg_macro", "fsanitize", "pretty_function", "views_zip"],
};

const CONTAINERS = [
  "vector",
  "array",
  "deque",
  "stack",
  "queue",
  "priority_queue",
  "set",
  "map",
  "unordered_map",
  "bitset",
];

describe("cpp content", () => {
  it("cpp has at least 80 entries", () => {
    expect(ENTRIES.length).toBeGreaterThanOrEqual(80);
  });

  it("every section has entries", () => {
    for (const section of sectionsOf("cpp")) {
      expect(
        ENTRIES.filter((e) => e.section === section.id).length,
        section.id,
      ).toBeGreaterThanOrEqual(3);
    }
  });

  it("the minimum entries of the note exist", () => {
    for (const [section, ids] of Object.entries(MINIMUM)) {
      for (const id of ids) expect(byId.get(id)?.section, id).toBe(section);
    }
  });

  it("every example has at most 6 lines", () => {
    for (const e of ENTRIES) {
      const lines = e.example.split("\n");
      expect(lines.length, e.id).toBeLessThanOrEqual(6);
      expect(e.example.trim().length, e.id).toBeGreaterThan(0);
      expect(e.example, e.id).toBe(e.example.trim());
    }
  });

  it("every pitfall is one sentence", () => {
    for (const e of ENTRIES) {
      expect(e.pitfalls.length, e.id).toBeGreaterThanOrEqual(1);
      for (const p of e.pitfalls) {
        expect(p, e.id).toMatch(/\.$/);
        expect(p, e.id).not.toMatch(/[.!?]\s+[A-ZÀ-Ú]/);
      }
    }
  });

  it("every entry has a title, a signature and tags", () => {
    for (const e of ENTRIES) {
      expect(e.title.length, e.id).toBeGreaterThan(0);
      expect(e.signature.length, e.id).toBeGreaterThan(0);
      expect(e.tags.length, e.id).toBeGreaterThan(0);
      expect(e.id, e.id).toMatch(/^[a-z0-9_]+$/);
    }
  });

  it("every entry links to cppreference", () => {
    for (const e of ENTRIES) {
      expect(e.link, e.id).toMatch(/^https:\/\/en\.cppreference\.com\/w\/cpp\//);
    }
  });

  it("every container has a complexity table", () => {
    for (const id of CONTAINERS) {
      const table = byId.get(id)?.complexity;
      expect(Array.isArray(table), id).toBe(true);
      expect((table as readonly unknown[]).length, id).toBeGreaterThanOrEqual(2);
    }
  });

  it("judge entries need C++23", () => {
    const judged = ENTRIES.filter((e) => e.judge === true);
    expect(judged.length).toBeGreaterThanOrEqual(3);
    for (const e of judged) expect(e.since, e.id).toBe("C++23");
    for (const e of ENTRIES.filter((x) => x.since === "C++23")) expect(e.judge, e.id).toBe(true);
  });

  it("at least 136 cpp entries", () => {
    expect(ENTRIES.length).toBeGreaterThanOrEqual(136);
  });

  it("pb_ds and gnu sections precede extras", () => {
    const sections = sectionsOf("cpp");
    const ids = sections.map((s) => s.id);
    const pbdsAt = ids.indexOf("pb_ds");
    const gnuAt = ids.indexOf("gnu");
    const extrasAt = ids.indexOf("extras");
    expect(pbdsAt).toBeGreaterThanOrEqual(0);
    expect(gnuAt).toBe(pbdsAt + 1);
    expect(extrasAt).toBe(gnuAt + 1);
    expect(sections[pbdsAt]?.title).toBe("pb_ds");
    expect(sections[gnuAt]?.title).toBe("Extensões GNU");
  });

  it("pb_ds entries keep their ids after moving", () => {
    for (const id of ["ordered_set", "gp_hash_table"]) {
      expect(byId.get(id)?.section, id).toBe("pb_ds");
      expect(refLink(`cpp/${id}`)).toBe(`#cpp/${id}`);
    }
  });

  it("the minimum entries of T50 exist", () => {
    for (const [section, ids] of Object.entries(MINIMUM_T50)) {
      for (const id of ids) expect(byId.get(id)?.section, id).toBe(section);
    }
  });

  it("boyer_moore_searcher warns about worst-case quadratic complexity", () => {
    expect(byId.get("boyer_moore_searcher")?.complexity).toBe(
      "linear em média, O(n·m) no pior caso",
    );
  });
});
