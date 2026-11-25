import { describe, expect, it } from "vitest";
import {
  cppDiv,
  cppMod,
  i32,
  i64,
  simAccumulateInt,
  simAccumulateU32,
  simAccumulateU64,
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
  SIZE_T_MAX,
  STRING_NPOS,
  u32,
  u64,
} from "./sim";

// T42 AC-1: pure TypeScript simulator of STL and libstdc++ integer semantics.

describe("stl simulator (AC-1)", () => {
  it("wraps 32-bit and 64-bit integers with libstdc++ two's-complement semantics", () => {
    expect(SIZE_T_MAX).toBe(18446744073709551615n);
    expect(STRING_NPOS).toBe(SIZE_T_MAX);
    expect(u32(-1)).toBe(4294967295);
    expect(u32(4294967296)).toBe(0);
    expect(i32(2147483648)).toBe(-2147483648);
    expect(u64(-1)).toBe(18446744073709551615n);
    expect(u64(0)).toBe(0n);
    expect(i64(1n << 63n)).toBe(-(1n << 63n));
  });

  it("computes C++ signed division and remainder truncating toward zero without -0", () => {
    const cases: readonly (readonly [number, number, number, number])[] = [
      [7, 3, 2, 1],
      [-7, 3, -2, -1],
      [7, -3, -2, 1],
      [-7, -3, 2, -1],
      [-6, 3, -2, 0],
      [0, -5, 0, 0],
    ];
    for (const [a, b, q, r] of cases) {
      expect(Object.is(cppDiv(a, b), q)).toBe(true);
      expect(Object.is(cppMod(a, b), r)).toBe(true);
    }
    expect(() => cppDiv(5, 0)).toThrow(RangeError);
    expect(() => cppMod(5, 0)).toThrow(RangeError);
  });

  it("simulates sort and reverse on full, partial, negative and empty vectors", () => {
    expect(simSort([])).toEqual([]);
    expect(simSort([3, -1, 2, -1])).toEqual([-1, -1, 2, 3]);
    expect(simSort([3, -1, 2, 5], { desc: true })).toEqual([5, 3, 2, -1]);
    expect(simSort([9, 4, 1, 7, 2], { from: 1, to: 4 })).toEqual([9, 1, 4, 7, 2]);
    expect(simReverse([])).toEqual([]);
    expect(simReverse([1, 2, 3, 4])).toEqual([4, 3, 2, 1]);
    expect(simReverse([1, 2, 3, 4, 5], 1, 4)).toEqual([1, 4, 3, 2, 5]);
  });

  it("simulates iota, unique without erase, and next_permutation", () => {
    expect(simIota(0, 5)).toEqual([]);
    expect(simIota(4, -2)).toEqual([-2, -1, 0, 1]);

    expect(simUnique([])).toEqual({ values: [], uniqueEnd: 0, size: 0 });
    const u = simUnique([1, 1, 2, 2, 2, 1, 3, 3]);
    expect(u.size).toBe(8);
    expect(u.uniqueEnd).toBe(4);
    expect(u.values.slice(0, u.uniqueEnd)).toEqual([1, 2, 1, 3]);

    expect(simNextPermutation([])).toEqual({ ok: false, values: [] });
    expect(simNextPermutation([7])).toEqual({ ok: false, values: [7] });
    expect(simNextPermutation([1, 2, 3])).toEqual({ ok: true, values: [1, 3, 2] });
    expect(simNextPermutation([1, 3, 2])).toEqual({ ok: true, values: [2, 1, 3] });
    expect(simNextPermutation([3, 2, 1])).toEqual({ ok: false, values: [1, 2, 3] });
  });

  it("simulates lower_bound, upper_bound, set and multiset::erase", () => {
    expect(simLowerBound([], 5)).toBe(0);
    expect(simUpperBound([], 5)).toBe(0);
    const v = [-3, 1, 2, 2, 2, 5];
    expect(simLowerBound(v, -10)).toBe(0);
    expect(simLowerBound(v, 2)).toBe(2);
    expect(simLowerBound(v, 3)).toBe(5);
    expect(simLowerBound(v, 9)).toBe(6);
    expect(simUpperBound(v, -3)).toBe(1);
    expect(simUpperBound(v, 2)).toBe(5);
    expect(simUpperBound(v, 5)).toBe(6);

    expect(simSet([])).toEqual([]);
    expect(simSet([4, -2, 4, 1, -2])).toEqual([-2, 1, 4]);

    expect(simMultisetErase([], 3, "value")).toEqual([]);
    expect(simMultisetErase([2, 1, 2, 2, 5], 2, "value")).toEqual([1, 5]);
    expect(simMultisetErase([2, 1, 2, 2, 5], 2, "iterator")).toEqual([1, 2, 2, 5]);
    expect(simMultisetErase([1, 3], 2, "iterator")).toEqual([1, 3]);
  });

  it("simulates priority_queue (max and min), map[k] insertion and pair sorting", () => {
    expect(simPriorityQueue([], [], "max")).toEqual({ top: null, size: 0 });
    expect(simPriorityQueue([3, 10, -4, 7], ["pop"], "max")).toEqual({ top: 7, size: 3 });
    expect(simPriorityQueue([3, 10, -4, 7], ["pop"], "min")).toEqual({ top: 3, size: 3 });
    expect(simPriorityQueue([5], ["pop", "pop", { push: -2 }], "max")).toEqual({
      top: -2,
      size: 1,
    });

    const m = simMapOps(
      [["a", 5]],
      [
        { kind: "count", key: "b" },
        { kind: "read", key: "b" },
        { kind: "add", key: "c", delta: 3 },
      ],
    );
    expect(m.outputs).toEqual([0, 0, 3]);
    expect(m.size).toBe(3);
    expect(m.keys).toEqual(["a", "b", "c"]);

    expect(
      simSortPairs([
        [2, 5],
        [1, 9],
        [2, -1],
        [1, 2],
      ]),
    ).toEqual([
      [1, 2],
      [1, 9],
      [2, -1],
      [2, 5],
    ]);
    expect(
      simSortPairs(
        [
          [2, 5],
          [2, 1],
          [3, 0],
        ],
        true,
      ),
    ).toEqual([
      [3, 0],
      [2, 5],
      [2, 1],
    ]);
  });

  it("simulates stoi, to_string, string::find and unsigned size_t subtraction", () => {
    expect(simStoi("42")).toBe(42);
    expect(simStoi("  -07abc")).toBe(-7);
    expect(simStoi("+15x")).toBe(15);
    expect(() => simStoi("abc")).toThrow(RangeError);
    expect(simToString(-42)).toBe("-42");
    expect(simToString(SIZE_T_MAX)).toBe("18446744073709551615");

    expect(simStringFind("banana", "na")).toBe(2n);
    expect(simStringFind("banana", "na", 3)).toBe(4n);
    expect(simStringFind("banana", "zz")).toBe(STRING_NPOS);
    expect(simStringFind("", "a")).toBe(STRING_NPOS);

    expect(simSizeSub(0, 1)).toBe(SIZE_T_MAX);
    expect(simSizeSub(2, 5)).toBe(18446744073709551613n);
    expect(simSizeSub(5, 2)).toBe(3n);
  });

  it("simulates __builtin_popcount, __lg, bitset and accumulate", () => {
    expect(simPopcount(0)).toBe(0);
    expect(simPopcount(13)).toBe(3);
    expect(simPopcount(-1)).toBe(32);

    expect(simLg(1)).toBe(0);
    expect(simLg(8)).toBe(3);
    expect(simLg(15)).toBe(3);
    expect(() => simLg(0)).toThrow(RangeError);

    const b = simBitset(8, 13, [
      { kind: "flip", bit: 1 },
      { kind: "set", bit: 4 },
      { kind: "reset", bit: 0 },
    ]);
    // 13 = 00001101 -> flip(1) = 00001111 (15) -> set(4) = 00011111 (31) -> reset(0) = 00011110 (30)
    expect(b.toUlong).toBe(30n);
    expect(b.count).toBe(4);
    expect(b.test(0)).toBe(0);
    expect(b.test(1)).toBe(1);
    expect(b.toString).toBe("00011110");
    expect(simBitset(4, 0).toString).toBe("0000");

    // accumulate with int truncates double at each step
    expect(simAccumulateInt([], 7)).toBe(7);
    expect(simAccumulateInt([1.5, 1.5, 1.5], 0)).toBe(3);
    expect(simAccumulateInt([0.5, 0.5], 0)).toBe(0);
    expect(simAccumulateU32([4000000000, 500000000], 0)).toBe(205032704);
    expect(simAccumulateU64([4000000000, 500000000], 0n)).toBe(4500000000n);
  });
});
