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

export function u32(_n: number | bigint): number {
  throw new Error("todo");
}

export function i32(_n: number | bigint): number {
  throw new Error("todo");
}

export function u64(_n: number | bigint): bigint {
  throw new Error("todo");
}

export function i64(_n: number | bigint): bigint {
  throw new Error("todo");
}

export function cppDiv(_a: number, _b: number): number {
  throw new Error("todo");
}

export function cppMod(_a: number, _b: number): number {
  throw new Error("todo");
}

export function simSort(_arr: readonly number[], _opts?: SortOptions): number[] {
  throw new Error("todo");
}

export function simReverse(_arr: readonly number[], _from?: number, _to?: number): number[] {
  throw new Error("todo");
}

export function simIota(_length: number, _start: number): number[] {
  throw new Error("todo");
}

export function simUnique(_arr: readonly number[]): UniqueResult {
  throw new Error("todo");
}

export function simNextPermutation(_arr: readonly number[]): NextPermResult {
  throw new Error("todo");
}

export function simLowerBound(_sorted: readonly number[], _x: number): number {
  throw new Error("todo");
}

export function simUpperBound(_sorted: readonly number[], _x: number): number {
  throw new Error("todo");
}

export function simSet(_values: readonly number[]): number[] {
  throw new Error("todo");
}

export function simMultisetErase(
  _values: readonly number[],
  _target: number,
  _mode: "value" | "iterator",
): number[] {
  throw new Error("todo");
}

export function simPriorityQueue(
  _values: readonly number[],
  _ops: readonly PqOp[],
  _mode: "max" | "min",
): PqResult {
  throw new Error("todo");
}

export function simMapOps(
  _entries: readonly (readonly [string, number])[],
  _ops: readonly MapOp[],
): MapResult {
  throw new Error("todo");
}

export function simSortPairs(
  _pairs: readonly (readonly [number, number])[],
  _desc?: boolean,
): (readonly [number, number])[] {
  throw new Error("todo");
}

export function simStoi(_s: string): number {
  throw new Error("todo");
}

export function simToString(_n: number | bigint): string {
  throw new Error("todo");
}

export function simStringFind(_haystack: string, _needle: string, _pos?: number): bigint {
  throw new Error("todo");
}

export function simSizeSub(_size: number, _k: number): bigint {
  throw new Error("todo");
}

export function simPopcount(_x: number): number {
  throw new Error("todo");
}

export function simLg(_x: number): number {
  throw new Error("todo");
}

export function simBitset(
  _width: number,
  _value: number | bigint,
  _ops?: readonly BitsetOp[],
): BitsetResult {
  throw new Error("todo");
}

export function simAccumulateInt(_values: readonly number[], _init: number): number {
  throw new Error("todo");
}

export function simAccumulateU32(_values: readonly number[], _init: number): number {
  throw new Error("todo");
}

export function simAccumulateU64(_values: readonly (number | bigint)[], _init: bigint): bigint {
  throw new Error("todo");
}
