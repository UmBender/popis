import {
  T_BOOL,
  T_CHAR,
  T_INT,
  T_LLONG,
  T_SCHAR,
  T_SHORT,
  T_UCHAR,
  T_UINT,
  T_ULLONG,
  T_USHORT,
  arrayType,
  buildMemoryState,
  pointerType,
  structType,
  type MemoryState,
  type StructType,
  type VariableSpec,
} from "../memory";

// Recorded GNU gdb 18.1 formatting cases (T26 AC-3, AC-6, ADR-T26-1).
// Verified against live GNU gdb 18.1 by `npm run gdb:oracle`.

export type FormatCaseGroup =
  "formato" | "char" | "array" | "string" | "struct" | "ponteiro" | "whatis" | "memoria";

export type FormatCase = {
  readonly id: string;
  readonly group: FormatCaseGroup;
  readonly command: string;
  readonly expected: string;
};

const smallStruct: StructType = structType("Small", [
  { name: "c", type: T_CHAR },
  { name: "x", type: T_INT },
  { name: "y", type: T_INT },
]);

const paddedStruct: StructType = structType("Padded", [
  { name: "c", type: T_CHAR },
  { name: "x", type: T_INT },
  { name: "y", type: T_LLONG },
]);

const innerStruct: StructType = structType("Inner", [
  { name: "a", type: T_SHORT },
  { name: "b", type: T_CHAR },
]);

const outerStruct: StructType = structType("Outer", [
  { name: "tag", type: T_CHAR },
  { name: "in", type: innerStruct },
  { name: "val", type: T_INT },
]);

const nodeFields: { name: string; type: ReturnType<typeof pointerType> | typeof T_INT }[] = [];
const nodeStruct: StructType = structType("Node", nodeFields);
nodeFields.push({ name: "val", type: T_INT }, { name: "next", type: pointerType(nodeStruct) });

const bigArrVals = Array.from({ length: 205 }, (_, i) => i);
const bigRepVals = Array.from({ length: 210 }, () => 4);
const edgeRepVals = [
  ...Array.from({ length: 195 }, (_, i) => i),
  ...Array.from({ length: 20 }, () => 9),
];
const alpha200 = Array.from({ length: 200 }, (_, i) => String.fromCharCode(97 + (i % 26))).join("");
const alpha201 = Array.from({ length: 201 }, (_, i) => String.fromCharCode(97 + (i % 26))).join("");

export const FORMAT_CASE_VARS: readonly VariableSpec[] = [
  { name: "neg", type: T_INT, value: -1 },
  { name: "neg42", type: T_INT, value: -42 },
  { name: "zero", type: T_INT, value: 0 },
  { name: "pos", type: T_INT, value: 258 },
  { name: "big", type: T_INT, value: 0x12345678 },
  { name: "umax", type: T_UINT, value: 0xffffffff },
  { name: "sneg", type: T_SHORT, value: -1 },
  { name: "us", type: T_USHORT, value: 65535 },
  { name: "llneg", type: T_LLONG, value: -1n },
  { name: "ull", type: T_ULLONG, value: 0x0102030405060708n },
  { name: "sc", type: T_SCHAR, value: -1 },
  { name: "uc", type: T_UCHAR, value: 255 },
  { name: "chA", type: T_CHAR, value: 65 },
  { name: "chNl", type: T_CHAR, value: 10 },
  { name: "chTab", type: T_CHAR, value: 9 },
  { name: "chZero", type: T_CHAR, value: 0 },
  { name: "chQuote", type: T_CHAR, value: 39 },
  { name: "chDquote", type: T_CHAR, value: 34 },
  { name: "chSlash", type: T_CHAR, value: 92 },
  { name: "chCtrl", type: T_CHAR, value: 1 },
  { name: "chNeg", type: T_CHAR, value: -5 },
  { name: "bT", type: T_BOOL, value: true },
  { name: "bF", type: T_BOOL, value: false },
  { name: "arr5", type: arrayType(T_INT, 5), value: [3, 1, 4, 1, 5] },
  { name: "rep10", type: arrayType(T_INT, 10), value: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { name: "rep16", type: arrayType(T_INT, 16), value: Array.from({ length: 16 }, () => 0) },
  {
    name: "repMix",
    type: arrayType(T_INT, 15),
    value: [7, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 9, 9, 9],
  },
  { name: "bigArr", type: arrayType(T_INT, 205), value: bigArrVals },
  { name: "bigRep", type: arrayType(T_INT, 210), value: bigRepVals },
  { name: "edgeRep", type: arrayType(T_INT, 215), value: edgeRepVals },
  { name: "str6", type: arrayType(T_CHAR, 6), value: [97, 98, 99, 0, 0, 0] },
  { name: "str10", type: arrayType(T_CHAR, 10), value: [97, 98, 99, 0, 0, 0, 0, 0, 0, 0] },
  {
    name: "str15",
    type: arrayType(T_CHAR, 15),
    value: [97, 98, 99, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  { name: "strFull", type: arrayType(T_CHAR, 4), value: [97, 98, 99, 100] },
  { name: "strEsc", type: arrayType(T_CHAR, 8), value: [97, 10, 9, 34, 92, 39, 1, 0] },
  {
    name: "strRepChar",
    type: arrayType(T_CHAR, 12),
    value: Array.from({ length: 12 }, () => 120),
  },
  { name: "strAllZero", type: arrayType(T_CHAR, 12), value: Array.from({ length: 12 }, () => 0) },
  {
    name: "strMidRep",
    type: arrayType(T_CHAR, 15),
    value: [97, 98, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 99, 100],
  },
  { name: "strEmpty", type: arrayType(T_CHAR, 1), value: [0] },
  { name: "s201z", type: arrayType(T_CHAR, 201), value: alpha200 },
  { name: "s202z", type: arrayType(T_CHAR, 202), value: alpha201 },
  { name: "sm", type: smallStruct, value: { c: 97, x: 7, y: 9 } },
  { name: "pad", type: paddedStruct, value: { c: 65, x: 258, y: 999 } },
  { name: "out", type: outerStruct, value: { tag: 90, in: { a: 12, b: 107 }, val: 42 } },
  { name: "n2", type: nodeStruct, value: { val: 20, next: null } },
  { name: "n1", type: nodeStruct, value: { val: 10, next: { ref: "n2" } } },
  { name: "h", type: pointerType(nodeStruct), value: { ref: "n1" } },
  { name: "np", type: pointerType(nodeStruct), value: null },
  { name: "ip", type: pointerType(T_INT), value: { ref: "arr5", index: 1 } },
];

export function buildFormatCaseState(): MemoryState {
  return buildMemoryState(FORMAT_CASE_VARS);
}

export const FORMAT_CASE_CPP: readonly string[] = [
  "#include <iostream>",
  "struct Small { char c; int x; int y; };",
  "struct Padded { char c; int x; long long y; };",
  "struct Inner { short a; char b; };",
  "struct Outer { char tag; Inner in; int val; };",
  "struct Node { int val; Node* next; };",
  "int main() {",
  "  int neg = -1, neg42 = -42, zero = 0, pos = 258, big = 0x12345678;",
  "  unsigned int umax = 0xffffffffU;",
  "  short sneg = -1; unsigned short us = 65535;",
  "  long long llneg = -1LL; unsigned long long ull = 0x0102030405060708ULL;",
  "  signed char sc = -1; unsigned char uc = 255;",
  "  char chA = 'A', chNl = '\\n', chTab = '\\t', chZero = '\\0';",
  "  char chQuote = '\\'', chDquote = '\"', chSlash = '\\\\', chCtrl = 1, chNeg = -5;",
  "  bool bT = true, bF = false;",
  "  int arr5[5] = {3, 1, 4, 1, 5};",
  "  int rep10[10] = {0};",
  "  int rep16[16] = {0};",
  "  int repMix[15] = {7, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 9, 9, 9};",
  "  int bigArr[205]; for (int i = 0; i < 205; ++i) bigArr[i] = i;",
  "  int bigRep[210]; for (int i = 0; i < 210; ++i) bigRep[i] = 4;",
  "  int edgeRep[215]; for (int i = 0; i < 195; ++i) edgeRep[i] = i; for (int i = 195; i < 215; ++i) edgeRep[i] = 9;",
  "  char str6[6] = {'a', 'b', 'c', 0, 0, 0};",
  "  char str10[10] = {'a', 'b', 'c', 0, 0, 0, 0, 0, 0, 0};",
  "  char str15[15] = {'a', 'b', 'c', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0};",
  "  char strFull[4] = {'a', 'b', 'c', 'd'};",
  "  char strEsc[8] = {'a', '\\n', '\\t', '\"', '\\\\', '\\'', 1, 0};",
  "  char strRepChar[12] = {'x','x','x','x','x','x','x','x','x','x','x','x'};",
  "  char strAllZero[12] = {0};",
  "  char strMidRep[15] = {'a','b','x','x','x','x','x','x','x','x','x','x','x','c','d'};",
  "  char strEmpty[1] = {0};",
  "  char s201z[201]; for (int i = 0; i < 200; ++i) s201z[i] = static_cast<char>('a' + (i % 26)); s201z[200] = 0;",
  "  char s202z[202]; for (int i = 0; i < 201; ++i) s202z[i] = static_cast<char>('a' + (i % 26)); s202z[201] = 0;",
  "  Small sm{'a', 7, 9};",
  "  Padded pad{'A', 258, 999};",
  "  Outer out{'Z', {12, 'k'}, 42};",
  "  Node n2{20, nullptr};",
  "  Node n1{10, &n2};",
  "  Node* h = &n1;",
  "  Node* np = nullptr;",
  "  int* ip = &arr5[1];",
  "  int sink = neg + neg42 + zero + pos + big + static_cast<int>(umax) + sneg + us",
  "    + static_cast<int>(llneg) + static_cast<int>(ull) + sc + uc + chA + chNl + chTab",
  "    + chZero + chQuote + chDquote + chSlash + chCtrl + chNeg + bT + bF + arr5[0]",
  "    + rep10[0] + rep16[0] + repMix[0] + bigArr[0] + bigRep[0] + edgeRep[0] + str6[0]",
  "    + str10[0] + str15[0] + strFull[0] + strEsc[0] + strRepChar[0] + strAllZero[0]",
  "    + strMidRep[0] + strEmpty[0] + s201z[0] + s202z[0] + sm.x + pad.x + out.val",
  "    + h->val + (np == nullptr) + *ip;",
  "  return sink == 999999999 ? 1 : 0;",
  "}",
];

export const FORMAT_CASE_STOP_LINE = 49;

const FIRST_200 = Array.from({ length: 200 }, (_, i) => String(i)).join(", ");
const FIRST_195 = Array.from({ length: 195 }, (_, i) => String(i)).join(", ");

export const FORMAT_CASES: readonly FormatCase[] = [
  // formato: default, /x, /d, /u, /o, /t, bool
  { id: "fmt-neg-default", group: "formato", command: "p neg", expected: "-1" },
  { id: "fmt-neg-hex", group: "formato", command: "p/x neg", expected: "0xffffffff" },
  { id: "fmt-neg-dec", group: "formato", command: "p/d neg", expected: "-1" },
  { id: "fmt-neg-uint", group: "formato", command: "p/u neg", expected: "4294967295" },
  { id: "fmt-neg-oct", group: "formato", command: "p/o neg", expected: "037777777777" },
  {
    id: "fmt-neg-bin",
    group: "formato",
    command: "p/t neg",
    expected: "11111111111111111111111111111111",
  },
  { id: "fmt-zero-hex", group: "formato", command: "p/x zero", expected: "0x0" },
  { id: "fmt-zero-oct", group: "formato", command: "p/o zero", expected: "0" },
  { id: "fmt-zero-bin", group: "formato", command: "p/t zero", expected: "0" },
  { id: "fmt-pos-hex", group: "formato", command: "p/x pos", expected: "0x102" },
  { id: "fmt-pos-oct", group: "formato", command: "p/o pos", expected: "0402" },
  { id: "fmt-pos-bin", group: "formato", command: "p/t pos", expected: "100000010" },
  { id: "fmt-neg42-hex", group: "formato", command: "p/x neg42", expected: "0xffffffd6" },
  { id: "fmt-sneg-hex", group: "formato", command: "p/x sneg", expected: "0xffff" },
  { id: "fmt-sneg-uint", group: "formato", command: "p/u sneg", expected: "65535" },
  { id: "fmt-sneg-bin", group: "formato", command: "p/t sneg", expected: "1111111111111111" },
  { id: "fmt-llneg-hex", group: "formato", command: "p/x llneg", expected: "0xffffffffffffffff" },
  {
    id: "fmt-llneg-uint",
    group: "formato",
    command: "p/u llneg",
    expected: "18446744073709551615",
  },
  { id: "fmt-sc-hex", group: "formato", command: "p/x sc", expected: "0xff" },
  { id: "fmt-sc-uint", group: "formato", command: "p/u sc", expected: "255" },
  { id: "fmt-uc-dec", group: "formato", command: "p/d uc", expected: "-1" },
  { id: "fmt-bool-t", group: "formato", command: "p bT", expected: "true" },
  { id: "fmt-bool-f", group: "formato", command: "p bF", expected: "false" },
  { id: "fmt-bool-dec", group: "formato", command: "p/d bT", expected: "1" },
  { id: "fmt-bool-hex", group: "formato", command: "p/x bT", expected: "0x1" },

  // char & /c
  { id: "char-A", group: "char", command: "p chA", expected: "65 'A'" },
  { id: "char-nl", group: "char", command: "p chNl", expected: "10 '\\n'" },
  { id: "char-tab", group: "char", command: "p chTab", expected: "9 '\\t'" },
  { id: "char-zero", group: "char", command: "p chZero", expected: "0 '\\000'" },
  { id: "char-quote", group: "char", command: "p chQuote", expected: "39 '\\''" },
  { id: "char-dquote", group: "char", command: "p chDquote", expected: "34 '\"'" },
  { id: "char-slash", group: "char", command: "p chSlash", expected: "92 '\\\\'" },
  { id: "char-ctrl", group: "char", command: "p chCtrl", expected: "1 '\\001'" },
  { id: "char-neg", group: "char", command: "p chNeg", expected: "-5 '\\373'" },
  { id: "char-uc", group: "char", command: "p uc", expected: "255 '\\377'" },
  { id: "char-pc-65", group: "char", command: "p/c 65", expected: "65 'A'" },
  { id: "char-pc-10", group: "char", command: "p/c 10", expected: "10 '\\n'" },
  { id: "char-pc-uc", group: "char", command: "p/c uc", expected: "255 '\\377'" },
  { id: "char-pc-neg", group: "char", command: "p/c neg", expected: "-1 '\\377'" },
  { id: "char-px-A", group: "char", command: "p/x chA", expected: "0x41" },
  { id: "char-pd-A", group: "char", command: "p/d chA", expected: "65" },

  // arrays, slices, <repeats>, 200-element cap
  { id: "arr-5", group: "array", command: "p arr5", expected: "{3, 1, 4, 1, 5}" },
  { id: "arr-slice", group: "array", command: "p arr5[1]@3", expected: "{1, 4, 1}" },
  { id: "arr-ptr-slice", group: "array", command: "p *ip@3", expected: "{1, 4, 1}" },
  { id: "arr-hex", group: "array", command: "p/x arr5", expected: "{0x3, 0x1, 0x4, 0x1, 0x5}" },
  {
    id: "arr-rep10",
    group: "array",
    command: "p rep10",
    expected: "{0, 0, 0, 0, 0, 0, 0, 0, 0, 0}",
  },
  { id: "arr-rep16", group: "array", command: "p rep16", expected: "{0 <repeats 16 times>}" },
  {
    id: "arr-repMix",
    group: "array",
    command: "p repMix",
    expected: "{7, 5 <repeats 11 times>, 9, 9, 9}",
  },
  { id: "arr-big205", group: "array", command: "p bigArr", expected: `{${FIRST_200}...}` },
  { id: "arr-bigRep", group: "array", command: "p bigRep", expected: "{4 <repeats 210 times>}" },
  {
    id: "arr-edgeRep",
    group: "array",
    command: "p edgeRep",
    expected: `{${FIRST_195}, 9 <repeats 20 times>}`,
  },

  // char arrays / strings
  { id: "str-6", group: "string", command: "p str6", expected: '"abc\\000\\000"' },
  {
    id: "str-10",
    group: "string",
    command: "p str10",
    expected: '"abc\\000\\000\\000\\000\\000\\000"',
  },
  {
    id: "str-15",
    group: "string",
    command: "p str15",
    expected: "\"abc\", '\\000' <repeats 11 times>",
  },
  { id: "str-full", group: "string", command: "p strFull", expected: '"abcd"' },
  { id: "str-esc", group: "string", command: "p strEsc", expected: '"a\\n\\t\\"\\\\\'\\001"' },
  {
    id: "str-repChar",
    group: "string",
    command: "p strRepChar",
    expected: "'x' <repeats 12 times>",
  },
  {
    id: "str-allZero",
    group: "string",
    command: "p strAllZero",
    expected: "'\\000' <repeats 11 times>",
  },
  {
    id: "str-midRep",
    group: "string",
    command: "p strMidRep",
    expected: '"ab", \'x\' <repeats 11 times>, "cd"',
  },
  { id: "str-empty", group: "string", command: "p strEmpty", expected: '""' },
  { id: "str-201z", group: "string", command: "p s201z", expected: `"${alpha200}"` },
  { id: "str-202z", group: "string", command: "p s202z", expected: `"${alpha200}"...` },
  {
    id: "str-hex",
    group: "string",
    command: "p/x str6",
    expected: "{0x61, 0x62, 0x63, 0x0, 0x0, 0x0}",
  },

  // structs & pointers
  { id: "struct-sm", group: "struct", command: "p sm", expected: "{c = 97 'a', x = 7, y = 9}" },
  {
    id: "struct-sm-hex",
    group: "struct",
    command: "p/x sm",
    expected: "{c = 0x61, x = 0x7, y = 0x9}",
  },
  {
    id: "struct-out",
    group: "struct",
    command: "p out",
    expected: "{tag = 90 'Z', in = {a = 12, b = 107 'k'}, val = 42}",
  },
  { id: "ptr-n1", group: "ponteiro", command: "p n1", expected: "{val = 10, next = ADDR}" },
  { id: "ptr-n2", group: "ponteiro", command: "p n2", expected: "{val = 20, next = 0x0}" },
  { id: "ptr-deref-h", group: "ponteiro", command: "p *h", expected: "{val = 10, next = ADDR}" },
  {
    id: "ptr-deref-next",
    group: "ponteiro",
    command: "p *h->next",
    expected: "{val = 20, next = 0x0}",
  },
  { id: "ptr-chain-val", group: "ponteiro", command: "p h->next->val", expected: "20" },
  { id: "ptr-null", group: "ponteiro", command: "p np", expected: "(Node *) 0x0" },
  { id: "ptr-nonnull", group: "ponteiro", command: "p ip", expected: "(int *) ADDR" },
  { id: "ptr-nonnull-hex", group: "ponteiro", command: "p/x ip", expected: "ADDR" },
  {
    id: "ptr-null-deref",
    group: "ponteiro",
    command: "p *np",
    expected: "Cannot access memory at address 0x0",
  },

  // whatis & ptype
  { id: "whatis-ip", group: "whatis", command: "whatis ip", expected: "type = int *" },
  { id: "whatis-arr5", group: "whatis", command: "whatis arr5", expected: "type = int [5]" },
  { id: "whatis-sm", group: "whatis", command: "whatis sm", expected: "type = Small" },
  { id: "whatis-h", group: "whatis", command: "whatis h", expected: "type = Node *" },
  { id: "whatis-str6", group: "whatis", command: "whatis str6", expected: "type = char [6]" },
  {
    id: "ptype-sm",
    group: "whatis",
    command: "ptype sm",
    expected: "type = struct Small {\n    char c;\n    int x;\n    int y;\n}",
  },

  // x/Nfu memory examination
  { id: "x-4xb-pos", group: "memoria", command: "x/4xb &pos", expected: "0x02 0x01 0x00 0x00" },
  { id: "x-4xb-big", group: "memoria", command: "x/4xb &big", expected: "0x78 0x56 0x34 0x12" },
  { id: "x-4db-neg", group: "memoria", command: "x/4db &neg", expected: "-1 -1 -1 -1" },
  { id: "x-4ub-neg", group: "memoria", command: "x/4ub &neg", expected: "255 255 255 255" },
  {
    id: "x-4tb-pos",
    group: "memoria",
    command: "x/4tb &pos",
    expected: "00000010 00000001 00000000 00000000",
  },
  {
    id: "x-4cb-str6",
    group: "memoria",
    command: "x/4cb &str6",
    expected: "97 'a' 98 'b' 99 'c' 0 '\\000'",
  },
  { id: "x-2xh-big", group: "memoria", command: "x/2xh &big", expected: "0x5678 0x1234" },
  { id: "x-2dh-big", group: "memoria", command: "x/2dh &big", expected: "22136 4660" },
  { id: "x-2uh-neg", group: "memoria", command: "x/2uh &neg", expected: "65535 65535" },
  { id: "x-1xw-big", group: "memoria", command: "x/1xw &big", expected: "0x12345678" },
  { id: "x-1dw-neg", group: "memoria", command: "x/1dw &neg", expected: "-1" },
  { id: "x-1uw-neg", group: "memoria", command: "x/1uw &neg", expected: "4294967295" },
  {
    id: "x-1xg-ull",
    group: "memoria",
    command: "x/1xg &ull",
    expected: "0x0102030405060708",
  },
  {
    id: "x-1ug-llneg",
    group: "memoria",
    command: "x/1ug &llneg",
    expected: "18446744073709551615",
  },
  { id: "x-4dw-arr5", group: "memoria", command: "x/4dw arr5", expected: "3 1 4 1" },
  {
    id: "x-4xw-arr5",
    group: "memoria",
    command: "x/4xw arr5",
    expected: "0x00000003 0x00000001 0x00000004 0x00000001",
  },
  { id: "x-s-str6", group: "memoria", command: "x/s str6", expected: '"abc"' },
  {
    id: "x-s-strEsc",
    group: "memoria",
    command: "x/s strEsc",
    expected: '"a\\n\\t\\"\\\\\'\\001"',
  },
];
