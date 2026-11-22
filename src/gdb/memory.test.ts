import { describe, expect, it } from "vitest";
import {
  MemoryAccessError,
  T_BOOL,
  T_CHAR,
  T_INT,
  T_LLONG,
  T_LONG,
  T_SCHAR,
  T_SHORT,
  T_UCHAR,
  T_UINT,
  T_ULLONG,
  T_ULONG,
  T_USHORT,
  alignOf,
  arrayType,
  buildMemoryState,
  offsetOf,
  pointerType,
  ptypeString,
  readBytes,
  readLittleEndian,
  readScalar,
  sizeOf,
  structLayout,
  structType,
  typeName,
  variableBytes,
  writeLittleEndian,
} from "./memory";

// T26 AC-1: x86-64 SysV LP64 types, alignment, padding, little-endian memory and offsetof.

const hexBytes = (bytes: Uint8Array): string =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(" ");

describe("gdb memory model (AC-1)", () => {
  it("primitive sizes and alignments follow x86-64 SysV LP64", () => {
    expect([sizeOf(T_CHAR), alignOf(T_CHAR)]).toEqual([1, 1]);
    expect([sizeOf(T_SCHAR), alignOf(T_SCHAR)]).toEqual([1, 1]);
    expect([sizeOf(T_UCHAR), alignOf(T_UCHAR)]).toEqual([1, 1]);
    expect([sizeOf(T_BOOL), alignOf(T_BOOL)]).toEqual([1, 1]);
    expect([sizeOf(T_SHORT), alignOf(T_SHORT)]).toEqual([2, 2]);
    expect([sizeOf(T_USHORT), alignOf(T_USHORT)]).toEqual([2, 2]);
    expect([sizeOf(T_INT), alignOf(T_INT)]).toEqual([4, 4]);
    expect([sizeOf(T_UINT), alignOf(T_UINT)]).toEqual([4, 4]);
    expect([sizeOf(T_LONG), alignOf(T_LONG)]).toEqual([8, 8]);
    expect([sizeOf(T_ULONG), alignOf(T_ULONG)]).toEqual([8, 8]);
    expect([sizeOf(T_LLONG), alignOf(T_LLONG)]).toEqual([8, 8]);
    expect([sizeOf(T_ULLONG), alignOf(T_ULLONG)]).toEqual([8, 8]);
    expect([sizeOf(pointerType(T_INT)), alignOf(pointerType(T_INT))]).toEqual([8, 8]);
    expect([sizeOf(arrayType(T_INT, 5)), alignOf(arrayType(T_INT, 5))]).toEqual([20, 4]);
  });

  it("struct {char; int; long long} has size 16 and offsets 0 4 8", () => {
    const padded = structType("Padded", [
      { name: "c", type: T_CHAR },
      { name: "x", type: T_INT },
      { name: "y", type: T_LLONG },
    ]);

    expect(sizeOf(padded)).toBe(16);
    expect(alignOf(padded)).toBe(8);
    expect(offsetOf(padded, "c")).toBe(0);
    expect(offsetOf(padded, "x")).toBe(4);
    expect(offsetOf(padded, "y")).toBe(8);
    expect(structLayout(padded).fields.map((f) => f.offset)).toEqual([0, 4, 8]);
  });

  it("computes tail padding and nested struct layout accurately", () => {
    const inner = structType("Inner", [
      { name: "a", type: T_SHORT },
      { name: "b", type: T_CHAR },
    ]);
    expect(sizeOf(inner)).toBe(4);
    expect(alignOf(inner)).toBe(2);

    const outer = structType("Outer", [
      { name: "tag", type: T_CHAR },
      { name: "in", type: inner },
      { name: "val", type: T_INT },
    ]);
    expect(sizeOf(outer)).toBe(12);
    expect(alignOf(outer)).toBe(4);
    expect(offsetOf(outer, "tag")).toBe(0);
    expect(offsetOf(outer, "in")).toBe(2);
    expect(offsetOf(outer, "val")).toBe(8);

    const node = structType("Node", [
      { name: "val", type: T_INT },
      { name: "next", type: pointerType(T_INT) },
    ]);
    expect(sizeOf(node)).toBe(16);
    expect(offsetOf(node, "val")).toBe(0);
    expect(offsetOf(node, "next")).toBe(8);
  });

  it("int 258 is stored as bytes 02 01 00 00", () => {
    const state = buildMemoryState([{ name: "n", type: T_INT, value: 258 }]);
    expect(hexBytes(variableBytes(state, "n"))).toBe("02 01 00 00");

    const v = state.vars.get("n")!;
    expect(readScalar(state, v.addr, T_INT)).toBe(258n);
  });

  it("serializes negative two's complement ints, bools, arrays, structs and pointers in little-endian", () => {
    const node = structType("Node", [
      { name: "val", type: T_INT },
      { name: "next", type: pointerType(T_INT) },
    ]);
    const state = buildMemoryState([
      { name: "neg", type: T_INT, value: -1 },
      { name: "big", type: T_INT, value: 0x12345678 },
      { name: "flag", type: T_BOOL, value: true },
      { name: "arr", type: arrayType(T_INT, 3), value: [10, 20, 30] },
      { name: "str", type: arrayType(T_CHAR, 6), value: "abc" },
      { name: "p", type: pointerType(T_INT), value: { ref: "arr", index: 1 } },
      { name: "np", type: pointerType(T_INT), value: null },
      { name: "nd", type: node, value: { val: 7, next: { ref: "arr", index: 2 } } },
    ]);

    expect(hexBytes(variableBytes(state, "neg"))).toBe("ff ff ff ff");
    expect(hexBytes(variableBytes(state, "big"))).toBe("78 56 34 12");
    expect(hexBytes(variableBytes(state, "flag"))).toBe("01");
    expect(hexBytes(variableBytes(state, "str"))).toBe("61 62 63 00 00 00");

    const arrAddr = state.vars.get("arr")!.addr;
    const pVal = readScalar(state, state.vars.get("p")!.addr, pointerType(T_INT));
    expect(pVal).toBe(arrAddr + 4n);
    expect(readScalar(state, pVal, T_INT)).toBe(20n);

    const npVal = readScalar(state, state.vars.get("np")!.addr, pointerType(T_INT));
    expect(npVal).toBe(0n);

    const ndAddr = state.vars.get("nd")!.addr;
    expect(readScalar(state, ndAddr, T_INT)).toBe(7n);
    expect(readScalar(state, ndAddr + 8n, pointerType(T_INT))).toBe(arrAddr + 8n);
  });

  it("throws MemoryAccessError with gdb message when reading null or unmapped address", () => {
    const state = buildMemoryState([{ name: "x", type: T_INT, value: 1 }]);
    expect(() => readBytes(state, 0n, 4)).toThrow(MemoryAccessError);
    expect(() => readBytes(state, 0n, 4)).toThrow("Cannot access memory at address 0x0");
    expect(() => readBytes(state, 0xdeadbeefn, 4)).toThrow(MemoryAccessError);
  });

  it("formats typeName and ptypeString like gdb 18.1", () => {
    const small = structType("Small", [
      { name: "c", type: T_CHAR },
      { name: "x", type: T_INT },
      { name: "y", type: T_INT },
    ]);
    expect(typeName(pointerType(T_INT))).toBe("int *");
    expect(typeName(arrayType(T_INT, 5))).toBe("int [5]");
    expect(typeName(small)).toBe("Small");
    expect(typeName(pointerType(small))).toBe("Small *");
    expect(ptypeString(small)).toBe("type = struct Small {\n    char c;\n    int x;\n    int y;\n}");

    // Round-trip low-level little-endian helper directly.
    const buf = new Uint8Array(8);
    writeLittleEndian(buf, 0, 8, -1n);
    expect(readLittleEndian(buf, 0, 8, true)).toBe(-1n);
    expect(readLittleEndian(buf, 0, 8, false)).toBe(0xffffffffffffffffn);
  });
});
