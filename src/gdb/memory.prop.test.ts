import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
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
  intInfo,
  pointerType,
  readLittleEndian,
  sizeOf,
  structLayout,
  structType,
  writeLittleEndian,
  type CType,
  type IntTypeName,
} from "./memory";

// T26 AC-1 property tests: write/read round-trip and ABI alignment/size invariants.

const RUNS = Number(process.env["FC_NUM_RUNS"] ?? 200);

const INT_TYPES: readonly IntTypeName[] = [
  "char",
  "signed char",
  "unsigned char",
  "short",
  "unsigned short",
  "int",
  "unsigned int",
  "long",
  "unsigned long",
  "long long",
  "unsigned long long",
];

const PRIMITIVE_TYPES: readonly CType[] = [
  T_CHAR,
  T_SCHAR,
  T_UCHAR,
  T_SHORT,
  T_USHORT,
  T_INT,
  T_UINT,
  T_LONG,
  T_ULONG,
  T_LLONG,
  T_ULLONG,
  T_BOOL,
  pointerType(T_INT),
];

const cTypeArb: fc.Arbitrary<CType> = fc.letrec((tie) => ({
  type: fc.oneof(
    { weight: 5, arbitrary: fc.constantFrom(...PRIMITIVE_TYPES) },
    {
      weight: 2,
      arbitrary: fc
        .tuple(tie("type") as fc.Arbitrary<CType>, fc.integer({ min: 1, max: 6 }))
        .map(([elem, len]) => arrayType(elem, len)),
    },
    {
      weight: 2,
      arbitrary: fc
        .array(tie("type") as fc.Arbitrary<CType>, { minLength: 1, maxLength: 5 })
        .map((fieldTypes) =>
          structType(
            "S",
            fieldTypes.map((type, idx) => ({ name: `f${String(idx)}`, type })),
          ),
        ),
    },
  ),
})).type as fc.Arbitrary<CType>;

describe("gdb memory properties (AC-1)", () => {
  it("reading back written little-endian bytes returns the exact value for every integer width", () => {
    for (const name of INT_TYPES) {
      const { size, signed } = intInfo(name);
      const bits = BigInt(size * 8);
      const min = signed ? -(1n << (bits - 1n)) : 0n;
      const max = signed ? (1n << (bits - 1n)) - 1n : (1n << bits) - 1n;

      fc.assert(
        fc.property(fc.bigInt({ min, max }), (val) => {
          const buf = new Uint8Array(size);
          writeLittleEndian(buf, 0, size, val);
          expect(readLittleEndian(buf, 0, size, signed)).toBe(val);
        }),
        { numRuns: Math.min(RUNS, 400) },
      );
    }
  });

  it("sizeof is always a positive multiple of alignof and struct fields are aligned and non-overlapping", () => {
    fc.assert(
      fc.property(cTypeArb, (t) => {
        const size = sizeOf(t);
        const align = alignOf(t);
        expect(align).toBeGreaterThanOrEqual(1);
        expect(size).toBeGreaterThanOrEqual(1);
        expect(size % align).toBe(0);

        if (t.kind === "struct") {
          const layout = structLayout(t);
          expect(layout.size).toBe(size);
          expect(layout.align).toBe(align);
          let cursor = 0;
          for (const field of layout.fields) {
            expect(field.offset).toBeGreaterThanOrEqual(cursor);
            expect(field.offset % alignOf(field.type)).toBe(0);
            cursor = field.offset + sizeOf(field.type);
          }
          expect(size).toBeGreaterThanOrEqual(cursor);
        }
      }),
      { numRuns: RUNS },
    );
  });
});
