import { describe, expect, it } from "vitest";
import { entriesOf, sectionsOf } from "../langs";
import { search } from "../search";
import { findPost39Apis, isAfter39 } from "./compat";

// T47 AC-1/AC-2: the Python content covers the nine sections of the note in short entries.

const ENTRIES = entriesOf("py");
const byId = new Map(ENTRIES.map((e) => [e.id, e]));

/** The minimum entries listed in the task note, by section and id. */
const MINIMUM: Readonly<Record<string, readonly string[]>> = {
  io: [
    "stdin_readline",
    "stdin_buffer_split",
    "map_int",
    "print_sep_end",
    "stdout_write_join",
    "print_unpack",
  ],
  perf: [
    "pypy_vs_cpython",
    "local_scope_main",
    "avoid_str_plus",
    "preallocate_list",
    "array_module",
    "flat_list_2d",
  ],
  recursion: ["setrecursionlimit", "threading_stack_size", "iterative_dfs_stack"],
  structures: [
    "list",
    "deque",
    "counter",
    "defaultdict",
    "heapq_min",
    "heapq_max_tuples",
    "bisect_left",
    "bisect_right",
    "bisect_key",
    "set",
    "dict_antihash",
  ],
  sorting: [
    "sort_sorted",
    "sort_key",
    "sort_reverse",
    "cmp_to_key",
    "timsort_stability",
    "sort_multi_key",
  ],
  iter_func: [
    "accumulate",
    "product",
    "permutations",
    "combinations",
    "groupby",
    "chain",
    "lru_cache",
    "reduce",
    "pairwise",
  ],
  numbers: [
    "bigint",
    "floor_div_mod",
    "pow_mod",
    "pow_modinv",
    "math_gcd",
    "math_lcm",
    "math_isqrt",
    "math_comb",
    "fraction",
    "decimal",
    "float_precision",
    "int_base_bin_hex",
    "int_bit_count",
  ],
  strings: [
    "slicing",
    "str_split",
    "str_join",
    "ord_chr",
    "str_count",
    "str_find_index",
    "str_zfill",
    "fstring_format",
  ],
  pitfalls: [
    "shallow_matrix_mul",
    "mutable_default_arg",
    "shallow_vs_deep_copy",
    "is_vs_eq",
    "float_comparison",
    "match_case",
  ],
};

const STRUCTURES = ["list", "deque", "counter", "defaultdict", "heapq_min", "set", "dict_antihash"];

describe("python content", () => {
  it("py has at least 70 entries", () => {
    expect(ENTRIES.length).toBeGreaterThanOrEqual(70);
  });

  it("every section has entries", () => {
    const sections = sectionsOf("py");
    expect(sections).toHaveLength(9);
    for (const section of sections) {
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

  it("every entry links to Python 3.9 docs", () => {
    for (const e of ENTRIES) {
      expect(e.link, e.id).toMatch(/^https:\/\/docs\.python\.org\/3\.9\//);
    }
  });

  it("every data structure has a complexity table", () => {
    for (const id of STRUCTURES) {
      const table = byId.get(id)?.complexity;
      expect(Array.isArray(table), id).toBe(true);
      expect((table as readonly unknown[]).length, id).toBeGreaterThanOrEqual(2);
    }
  });

  it("judge entries need Python above 3.9", () => {
    const judged = ENTRIES.filter((e) => e.judge === true);
    expect(judged.length).toBeGreaterThanOrEqual(4);
    for (const id of ["match_case", "pairwise", "bisect_key", "int_bit_count"]) {
      expect(byId.get(id)?.judge, id).toBe(true);
    }
    for (const e of judged) expect(isAfter39(e.since), e.id).toBe(true);
    for (const e of ENTRIES.filter((x) => isAfter39(x.since))) {
      expect(e.judge, e.id).toBe(true);
    }
    // Python 3.9 features stay allowed at the WF judge.
    expect(byId.get("math_lcm")?.judge).toBeUndefined();
    expect(byId.get("lru_cache")?.judge).toBeUndefined();
  });

  it("non-judge examples do not use post-3.9 APIs", () => {
    for (const e of ENTRIES.filter((x) => x.judge !== true)) {
      expect(findPost39Apis(e.example), e.id).toEqual([]);
    }
  });

  it.each([
    ["readline", "stdin_readline"],
    ["busca binaria", "bisect_left"],
    ["bisect_left", "bisect_left"],
    ["deque", "deque"],
    ["anti-hash", "dict_antihash"],
    ["cmp_to_key", "cmp_to_key"],
    ["pairwise", "pairwise"],
    ["isqrt", "math_isqrt"],
    ["lcm", "math_lcm"],
    ["f-string", "fstring_format"],
    ["setrecursionlimit", "setrecursionlimit"],
    ["match", "match_case"],
  ])("search finds common Python query %s first: %s", (query, id) => {
    expect(search(ENTRIES, query)[0]?.id).toBe(id);
  });
});
