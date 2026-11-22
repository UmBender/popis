import { describe, expect, it } from "vitest";
import { evalExpr } from "./expr";
import {
  MemoryAccessError,
  T_BOOL,
  T_CHAR,
  T_INT,
  T_LLONG,
  T_SCHAR,
  T_SHORT,
  T_UCHAR,
  T_UINT,
  T_USHORT,
  arrayType,
  buildMemoryState,
  pointerType,
  readScalar,
  structType,
} from "./memory";

// T26 AC-2: C expression evaluation subset (arithmetic, C division/mod,
// casts, promotions, unsigned wrap, [], ., ->, *, &, @, sizeof, null deref).

function makeState() {
  const inner = structType("Inner", [
    { name: "a", type: T_SHORT },
    { name: "b", type: T_CHAR },
  ]);
  const outer = structType("Outer", [
    { name: "tag", type: T_CHAR },
    { name: "in", type: inner },
    { name: "val", type: T_INT },
  ]);
  const padded = structType("Padded", [
    { name: "c", type: T_CHAR },
    { name: "x", type: T_INT },
    { name: "y", type: T_LLONG },
  ]);
  const nodeFields: { name: string; type: ReturnType<typeof pointerType> | typeof T_INT }[] = [];
  const node = structType("Node", nodeFields);
  nodeFields.push({ name: "val", type: T_INT }, { name: "next", type: pointerType(node) });

  return buildMemoryState(
    [
      { name: "a", type: T_INT, value: -7 },
      { name: "b", type: T_INT, value: 2 },
      { name: "c", type: T_INT, value: 3 },
      { name: "uc0", type: T_UCHAR, value: 0 },
      { name: "us0", type: T_USHORT, value: 0 },
      { name: "ui0", type: T_UINT, value: 0 },
      { name: "sc", type: T_SCHAR, value: -5 },
      { name: "flag", type: T_BOOL, value: true },
      { name: "arr", type: arrayType(T_INT, 5), value: [3, 1, 4, 1, 5] },
      { name: "ip", type: pointerType(T_INT), value: { ref: "arr", index: 1 } },
      { name: "out", type: outer, value: { tag: 90, in: { a: 12, b: 107 }, val: 42 } },
      { name: "n2", type: node, value: { val: 20, next: null } },
      { name: "n1", type: node, value: { val: 10, next: { ref: "n2" } } },
      { name: "h", type: pointerType(node), value: { ref: "n1" } },
      { name: "np", type: pointerType(node), value: null },
    ],
    [padded],
  );
}

function evalScalar(expr: string): { value: bigint; typeName: string } {
  const state = makeState();
  const res = evalExpr(expr, state);
  if (res.kind !== "scalar") throw new Error(`expected scalar for "${expr}", got ${res.kind}`);
  const typeName = res.type.kind === "int" ? res.type.name : res.type.kind;
  return { value: res.raw, typeName };
}

describe("gdb expression evaluator (AC-2)", () => {
  it("evaluates C truncated-toward-zero division, remainder and unary minus", () => {
    const cases: readonly (readonly [string, bigint])[] = [
      ["-7 / 2", -3n],
      ["-7 % 3", -1n],
      ["7 % -3", 1n],
      ["-7 % -3", -1n],
      ["a / b", -3n],
      ["a % c", -1n],
      ["-(a + 2)", 5n],
      ["2 + 3 * 4", 14n],
      ["(2 + 3) * 4", 20n],
      ["0x10 + 010", 24n],
      ["'A' + 1", 66n],
    ];
    for (const [expr, expected] of cases) {
      expect(evalScalar(expr).value, expr).toBe(expected);
    }
  });

  it("applies C casts, integer promotions and unsigned wraparound", () => {
    const cases: readonly (readonly [string, bigint, string])[] = [
      ["(unsigned)-1", 4294967295n, "unsigned int"],
      ["(unsigned int)-1", 4294967295n, "unsigned int"],
      ["(unsigned short)-1", 65535n, "unsigned short"],
      ["(unsigned char)-1", 255n, "unsigned char"],
      ["(signed char)255", -1n, "signed char"],
      ["(short)65535", -1n, "short"],
      ["(long long)-1", -1n, "long long"],
      ["(unsigned char)0 - 1", -1n, "int"],
      ["(unsigned short)0 - 1", -1n, "int"],
      ["(unsigned int)0 - 1", 4294967295n, "unsigned int"],
      ["uc0 - 1", -1n, "int"],
      ["us0 - 1", -1n, "int"],
      ["ui0 - 1", 4294967295n, "unsigned int"],
      ["(unsigned char)200 + (unsigned char)100", 300n, "int"],
      ["-1 + 0U", 4294967295n, "unsigned int"],
      ["-5 / 2U", 2147483645n, "unsigned int"],
      ["(bool)5", 1n, "bool"],
      ["(bool)0", 0n, "bool"],
    ];
    for (const [expr, expected, expectedType] of cases) {
      const got = evalScalar(expr);
      expect(got.value, expr).toBe(expected);
      expect(got.typeName, `${expr} type`).toBe(expectedType);
    }
  });

  it("evaluates indexing, pointer arithmetic, dereference, struct members, @ slices and sizeof", () => {
    const state = makeState();

    expect(evalScalar("arr[2] + 10").value).toBe(14n);
    expect(evalScalar("*(arr + 2)").value).toBe(4n);
    expect(evalScalar("*ip").value).toBe(1n);
    expect(evalScalar("ip[1]").value).toBe(4n);
    expect(evalScalar("*(&arr[2])").value).toBe(4n);
    expect(evalScalar("out.in.a").value).toBe(12n);
    expect(evalScalar("out.val").value).toBe(42n);
    expect(evalScalar("h->val").value).toBe(10n);
    expect(evalScalar("(*h).val").value).toBe(10n);
    expect(evalScalar("h->next->val").value).toBe(20n);
    expect(evalScalar("(*h->next).val").value).toBe(20n);
    expect(evalScalar("sizeof(Padded)").value).toBe(16n);
    expect(evalScalar("sizeof(Outer)").value).toBe(12n);
    expect(evalScalar("sizeof(arr)").value).toBe(20n);
    expect(evalScalar("sizeof(ip)").value).toBe(8n);
    expect(evalScalar("sizeof(int)").value).toBe(4n);
    expect(evalScalar("sizeof(long)").value).toBe(8n);
    expect(evalScalar("sizeof(long long)").value).toBe(8n);
    expect(evalScalar("sizeof(char)").value).toBe(1n);
    expect(evalScalar("sizeof(bool)").value).toBe(1n);

    // Artificial array @ slices: arr[1]@3 and *ip@3.
    const slice1 = evalExpr("arr[1]@3", state);
    expect(slice1.kind).toBe("synthetic-array");
    if (slice1.kind === "synthetic-array") {
      expect(slice1.length).toBe(3);
      expect(readScalar(state, slice1.addr, T_INT)).toBe(1n);
      expect(readScalar(state, slice1.addr + 4n, T_INT)).toBe(4n);
      expect(readScalar(state, slice1.addr + 8n, T_INT)).toBe(1n);
    }

    const slice2 = evalExpr("*ip@3", state);
    expect(slice2.kind).toBe("synthetic-array");
    if (slice2.kind === "synthetic-array") {
      expect(slice2.length).toBe(3);
      expect(slice2.addr).toBe(slice1.kind === "synthetic-array" ? slice1.addr : 0n);
    }
  });

  it("dereferencing a null pointer throws Cannot access memory at address 0x0", () => {
    const state = makeState();
    expect(() => evalExpr("*np", state)).toThrow(MemoryAccessError);
    expect(() => evalExpr("*np", state)).toThrow("Cannot access memory at address 0x0");
    expect(() => evalExpr("np->val", state)).toThrow("Cannot access memory at address 0x0");
    expect(() => evalExpr("*h->next->next", state)).toThrow("Cannot access memory at address 0x0");
    expect(() => evalExpr("np[0]", state)).toThrow("Cannot access memory at address 0x0");
  });

  it("handles literal suffixes, char escapes, pointer arithmetic, sizeof variants, 64-bit promotions and ExprErrors", () => {
    const state = makeState();
    expect(evalScalar("'\\n' + '\\t'").value).toBe(19n);
    expect(evalScalar("1L + 2LL").value).toBe(3n);
    expect(evalScalar("1UL + 2ULL").value).toBe(3n);
    expect(evalScalar("3000000000").typeName).toBe("long");
    expect(evalScalar("5000000000U").typeName).toBe("unsigned long");
    expect(evalScalar("(long long)1 + 1U").typeName).toBe("long long");
    expect(evalScalar("(long long)1 + 1UL").typeName).toBe("unsigned long long");
    expect(evalScalar("true + false + +a").value).toBe(-6n);
    expect(evalScalar("*(2 + arr)").value).toBe(4n);
    expect(evalScalar("*(ip - 1)").value).toBe(3n);
    expect(evalScalar("sizeof(struct Padded)").value).toBe(16n);
    expect(evalScalar("sizeof(struct Padded *)").value).toBe(8n);
    expect(evalScalar("sizeof a").value).toBe(4n);
    expect(evalScalar("sizeof(arr[1]@3)").value).toBe(12n);
    expect(evalExpr("nullptr", state).kind).toBe("scalar");

    const bad = [
      "",
      "1 / 0",
      "1 % 0",
      "1 +",
      "1 2",
      "$",
      "'\\q'",
      "'ab'",
      "(int)arr",
      "arr + arr",
      "arr * 2",
      "-arr",
      "+arr",
      "*a",
      "&5",
      "a[0]",
      "a.x",
      "out.nope",
      "out.1",
      "a->x",
      "h->nope",
      "h->1",
      "ghost",
      "5@3",
      "arr[0]@-1",
      "(1 + 2",
      "sizeof(int",
    ];
    for (const expr of bad) {
      expect(() => evalExpr(expr, state), expr).toThrow();
    }
  });
});
