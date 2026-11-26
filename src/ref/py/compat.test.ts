import { describe, expect, it } from "vitest";
import { findPost39Apis, isAfter39, POST_39_APIS } from "./compat";

// T47 AC-2: Python 3.9 version parsing and post-3.9 stdlib API detection for the oracle.

describe("python 3.9 compatibility checks", () => {
  it("isAfter39 distinguishes Python 3.9 from newer versions", () => {
    expect(isAfter39(undefined)).toBe(false);
    expect(isAfter39("Python 3.8")).toBe(false);
    expect(isAfter39("Python 3.9")).toBe(false);
    expect(isAfter39("C++23")).toBe(false);
    expect(isAfter39("Python 3.10")).toBe(true);
    expect(isAfter39("Python 3.11")).toBe(true);
    expect(isAfter39("Python 3.12")).toBe(true);
    expect(isAfter39("Python 4.0")).toBe(true);
  });

  it("findPost39Apis catches post-3.9 stdlib features and accepts 3.9 code", () => {
    expect(POST_39_APIS.length).toBeGreaterThanOrEqual(6);
    for (const api of POST_39_APIS) expect(isAfter39(api.since), api.name).toBe(true);

    const post39Cases: readonly (readonly [string, string])[] = [
      ["from itertools import pairwise\nprint(list(pairwise([1, 2, 3])))", "itertools.pairwise"],
      ["import itertools\nprint(list(itertools.pairwise([1, 2])))", "itertools.pairwise"],
      ["from bisect import bisect_left\nprint(bisect_left(a, 3, key=len))", "bisect key="],
      ["import bisect\nbisect.insort_right(a, x, key=lambda t: t[0])", "bisect key="],
      ["print((13).bit_count())", "int.bit_count"],
      ["print(list(zip([1, 2], [3, 4], strict=True)))", "zip strict="],
      ["from itertools import batched\nprint(list(batched([1, 2, 3], 2)))", "itertools.batched"],
      ["import math\nprint(math.cbrt(27))", "math.cbrt"],
      ["import math\nprint(math.sumprod([1, 2], [3, 4]))", "math.sumprod"],
      ["import tomllib\nprint(tomllib.loads('a = 1'))", "tomllib"],
    ];
    for (const [source, expected] of post39Cases) {
      const names = findPost39Apis(source).map((hit) => hit.name);
      expect(names, source).toContain(expected);
    }

    const py39Valid: readonly string[] = [
      "import math\nprint(math.lcm(4, 6, 8), math.gcd(12, 18, 24), math.isqrt(17))",
      "from functools import cache\n@cache\ndef f(n): return n",
      "from bisect import bisect_left, bisect_right\nprint(bisect_left([1, 3, 5], 3))",
      "print(list(zip([1, 2], [3, 4])))",
      'print(bin(13).count("1"), (13).bit_length())',
      'print("prefix_ok".removeprefix("prefix_"))',
      "# pairwise and bit_count in a comment do not count\nprint(1)",
    ];
    for (const source of py39Valid) {
      expect(findPost39Apis(source), source).toEqual([]);
    }
  });
});
