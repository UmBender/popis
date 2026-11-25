/** Maximum value of 64-bit unsigned `size_t` on x86-64. */
export const SIZE_T_MAX = (1n << 64n) - 1n;

/** Value of `std::string::npos` (`static_cast<size_t>(-1)` on 64-bit). */
export const STRING_NPOS = SIZE_T_MAX;

export type SortOptions = {
  readonly from?: number;
  readonly to?: number;
  readonly desc?: boolean;
};

export type UniqueResult = {
  readonly values: readonly number[];
  readonly uniqueEnd: number;
  readonly size: number;
};

export type NextPermResult = {
  readonly ok: boolean;
  readonly values: readonly number[];
};

export type PqOp = "pop" | { readonly push: number };

export type PqResult = {
  readonly top: number | null;
  readonly size: number;
};

export type MapOp =
  | { readonly kind: "read"; readonly key: string }
  | { readonly kind: "count"; readonly key: string }
  | { readonly kind: "add"; readonly key: string; readonly delta: number };

export type MapResult = {
  readonly size: number;
  readonly outputs: readonly number[];
  readonly keys: readonly string[];
};

export type BitsetOp = {
  readonly kind: "set" | "reset" | "flip";
  readonly bit: number;
};

export type BitsetResult = {
  readonly count: number;
  readonly test: (bit: number) => 0 | 1;
  readonly toUlong: bigint;
  readonly toString: string;
};

const noNegZero = (n: number): number => (n === 0 ? 0 : n);

/** 32-bit unsigned wraparound (`uint32_t`). */
export function u32(n: number | bigint): number {
  return Number(BigInt.asUintN(32, BigInt(n)));
}

/** 32-bit two's-complement wraparound (`int32_t`). */
export function i32(n: number | bigint): number {
  return Number(BigInt.asIntN(32, BigInt(n)));
}

/** 64-bit unsigned wraparound (`uint64_t` / `size_t`). */
export function u64(n: number | bigint): bigint {
  return BigInt.asUintN(64, BigInt(n));
}

/** 64-bit two's-complement wraparound (`int64_t`). */
export function i64(n: number | bigint): bigint {
  return BigInt.asIntN(64, BigInt(n));
}

/** C++ signed integer division (truncates toward zero). */
export function cppDiv(a: number, b: number): number {
  if (b === 0) throw new RangeError("division by zero");
  return noNegZero(Math.trunc(a / b));
}

/** C++ signed integer remainder (sign matches dividend `a`). */
export function cppMod(a: number, b: number): number {
  if (b === 0) throw new RangeError("modulo by zero");
  return noNegZero(a - Math.trunc(a / b) * b);
}

/** `std::sort` on `[from, to)` ascending or descending (`greater<int>()`). */
export function simSort(arr: readonly number[], opts: SortOptions = {}): number[] {
  const from = opts.from ?? 0;
  const to = opts.to ?? arr.length;
  const cmp =
    opts.desc === true ? (a: number, b: number) => b - a : (a: number, b: number) => a - b;
  const mid = arr.slice(from, to).sort(cmp);
  return [...arr.slice(0, from), ...mid, ...arr.slice(to)];
}

/** `std::reverse` on `[from, to)`. */
export function simReverse(arr: readonly number[], from = 0, to = arr.length): number[] {
  const mid = arr.slice(from, to).reverse();
  return [...arr.slice(0, from), ...mid, ...arr.slice(to)];
}

/** `std::iota(v.begin(), v.end(), start)`. */
export function simIota(length: number, start: number): number[] {
  return Array.from({ length }, (_, i) => i32(start + i));
}

/** `std::unique(v.begin(), v.end())` without `erase`. */
export function simUnique(arr: readonly number[]): UniqueResult {
  if (arr.length === 0) return { values: [], uniqueEnd: 0, size: 0 };
  const out = [...arr];
  let w = 1;
  for (let r = 1; r < out.length; r++) {
    if (out[r] !== out[w - 1]) {
      out[w] = out[r] as number;
      w += 1;
    }
  }
  return { values: out, uniqueEnd: w, size: arr.length };
}

/** `std::next_permutation(v.begin(), v.end())`. */
export function simNextPermutation(arr: readonly number[]): NextPermResult {
  const a = [...arr];
  let i = a.length - 2;
  while (i >= 0 && (a[i] as number) >= (a[i + 1] as number)) i -= 1;
  if (i < 0) {
    a.reverse();
    return { ok: false, values: a };
  }
  let j = a.length - 1;
  while ((a[j] as number) <= (a[i] as number)) j -= 1;
  const tmp = a[i] as number;
  a[i] = a[j] as number;
  a[j] = tmp;
  let lo = i + 1;
  let hi = a.length - 1;
  while (lo < hi) {
    const t = a[lo] as number;
    a[lo] = a[hi] as number;
    a[hi] = t;
    lo += 1;
    hi -= 1;
  }
  return { ok: true, values: a };
}

/** `std::lower_bound(v.begin(), v.end(), x) - v.begin()`. */
export function simLowerBound(sorted: readonly number[], x: number): number {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if ((sorted[mid] as number) < x) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** `std::upper_bound(v.begin(), v.end(), x) - v.begin()`. */
export function simUpperBound(sorted: readonly number[], x: number): number {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if ((sorted[mid] as number) <= x) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** `std::set<int>` sorted unique elements. */
export function simSet(values: readonly number[]): number[] {
  return [...new Set(values)].sort((a, b) => a - b);
}

/** `std::multiset<int>::erase(value)` vs `erase(find(value))`. */
export function simMultisetErase(
  values: readonly number[],
  target: number,
  mode: "value" | "iterator",
): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  if (mode === "value") {
    return sorted.filter((x) => x !== target);
  }
  const idx = sorted.indexOf(target);
  if (idx < 0) return sorted;
  return [...sorted.slice(0, idx), ...sorted.slice(idx + 1)];
}

/** `std::priority_queue<int>` (max-heap by default) or with `greater<int>` (min-heap). */
export function simPriorityQueue(
  values: readonly number[],
  ops: readonly PqOp[],
  mode: "max" | "min",
): PqResult {
  const cmp = mode === "max" ? (a: number, b: number) => b - a : (a: number, b: number) => a - b;
  const heap = [...values].sort(cmp);
  for (const op of ops) {
    if (op === "pop") {
      if (heap.length > 0) heap.shift();
    } else {
      heap.push(op.push);
      heap.sort(cmp);
    }
  }
  return { top: heap.length > 0 ? (heap[0] as number) : null, size: heap.length };
}

/** `std::map<string, int>` operations, including default-inserting `m[k]`. */
export function simMapOps(
  entries: readonly (readonly [string, number])[],
  ops: readonly MapOp[],
): MapResult {
  const map = new Map<string, number>(entries);
  const outputs: number[] = [];
  for (const op of ops) {
    if (op.kind === "count") {
      outputs.push(map.has(op.key) ? 1 : 0);
    } else if (op.kind === "read") {
      if (!map.has(op.key)) map.set(op.key, 0);
      outputs.push(map.get(op.key) as number);
    } else {
      const next = i32((map.get(op.key) ?? 0) + op.delta);
      map.set(op.key, next);
      outputs.push(next);
    }
  }
  return {
    size: map.size,
    outputs,
    keys: [...map.keys()].sort(),
  };
}

/** Lexicographic `std::sort` on `vector<pair<int, int>>`. */
export function simSortPairs(
  pairs: readonly (readonly [number, number])[],
  desc = false,
): (readonly [number, number])[] {
  const sign = desc ? -1 : 1;
  return [...pairs].sort(([a1, a2], [b1, b2]) => sign * (a1 !== b1 ? a1 - b1 : a2 - b2));
}

/** `std::stoi(s)` base-10 prefix parsing. */
export function simStoi(s: string): number {
  const m = /^\s*([+-]?\d+)/.exec(s);
  if (m === null) throw new RangeError(`invalid stoi input: ${s}`);
  return i32(BigInt(m[1] as string));
}

/** `std::to_string(n)`. */
export function simToString(n: number | bigint): string {
  return String(typeof n === "number" ? noNegZero(n) : n);
}

/** `std::string::find(needle, pos)` returning 64-bit `STRING_NPOS` when absent. */
export function simStringFind(haystack: string, needle: string, pos = 0): bigint {
  const idx = haystack.indexOf(needle, pos);
  return idx < 0 ? STRING_NPOS : BigInt(idx);
}

/** Unsigned 64-bit `v.size() - k`. */
export function simSizeSub(size: number, k: number): bigint {
  return u64(BigInt(size) - BigInt(k));
}

/** `__builtin_popcount(unsigned(x))`. */
export function simPopcount(x: number): number {
  let v = u32(x);
  let count = 0;
  while (v !== 0) {
    v &= v - 1;
    count += 1;
  }
  return count;
}

/** `std::__lg(x)` (`floor(log2(x))` for positive 32-bit `int`). */
export function simLg(x: number): number {
  if (x <= 0) throw new RangeError("__lg requires positive argument");
  return 31 - Math.clz32(u32(x));
}

/** `std::bitset<W>(value)` with optional set/reset/flip mutations. */
export function simBitset(
  width: number,
  value: number | bigint,
  ops: readonly BitsetOp[] = [],
): BitsetResult {
  const mask = (1n << BigInt(width)) - 1n;
  let v = BigInt(value) & mask;
  for (const op of ops) {
    const bit = 1n << BigInt(op.bit);
    if (op.kind === "set") v = (v | bit) & mask;
    else if (op.kind === "reset") v &= ~bit;
    else v = (v ^ bit) & mask;
  }
  const str = v.toString(2).padStart(width, "0");
  let count = 0;
  for (const ch of str) {
    if (ch === "1") count += 1;
  }
  return {
    count,
    test: (bit: number) => (((v >> BigInt(bit)) & 1n) === 1n ? 1 : 0),
    toUlong: v,
    toString: str,
  };
}

/** `std::accumulate(v.begin(), v.end(), init)` with an `int` accumulator (truncates floats per step). */
export function simAccumulateInt(values: readonly number[], init: number): number {
  let acc = i32(init);
  for (const x of values) {
    acc = i32(Math.trunc(acc + x));
  }
  return acc;
}

/** `std::accumulate(v.begin(), v.end(), uint32_t(init))` with 32-bit unsigned wraparound. */
export function simAccumulateU32(values: readonly number[], init: number): number {
  let acc = u32(init);
  for (const x of values) {
    acc = u32(BigInt(acc) + BigInt(u32(x)));
  }
  return acc;
}

/** `std::accumulate(v.begin(), v.end(), uint64_t(init))` with 64-bit unsigned wraparound. */
export function simAccumulateU64(values: readonly (number | bigint)[], init: bigint): bigint {
  let acc = u64(init);
  for (const x of values) {
    acc = u64(acc + u64(x));
  }
  return acc;
}
