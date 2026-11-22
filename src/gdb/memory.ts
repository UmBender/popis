export type IntTypeName =
  | "char"
  | "signed char"
  | "unsigned char"
  | "short"
  | "unsigned short"
  | "int"
  | "unsigned int"
  | "long"
  | "unsigned long"
  | "long long"
  | "unsigned long long";

export type PrimitiveType =
  | { readonly kind: "int"; readonly name: IntTypeName }
  | { readonly kind: "bool" };

export type StructField = {
  readonly name: string;
  readonly type: CType;
};

export type StructType = {
  readonly kind: "struct";
  readonly name: string;
  readonly fields: readonly StructField[];
};

export type ArrayType = {
  readonly kind: "array";
  readonly elem: CType;
  readonly length: number;
};

export type PointerType = {
  readonly kind: "pointer";
  readonly to: CType;
};

export type CType = PrimitiveType | ArrayType | StructType | PointerType;

export const T_CHAR: PrimitiveType = { kind: "int", name: "char" };
export const T_SCHAR: PrimitiveType = { kind: "int", name: "signed char" };
export const T_UCHAR: PrimitiveType = { kind: "int", name: "unsigned char" };
export const T_SHORT: PrimitiveType = { kind: "int", name: "short" };
export const T_USHORT: PrimitiveType = { kind: "int", name: "unsigned short" };
export const T_INT: PrimitiveType = { kind: "int", name: "int" };
export const T_UINT: PrimitiveType = { kind: "int", name: "unsigned int" };
export const T_LONG: PrimitiveType = { kind: "int", name: "long" };
export const T_ULONG: PrimitiveType = { kind: "int", name: "unsigned long" };
export const T_LLONG: PrimitiveType = { kind: "int", name: "long long" };
export const T_ULLONG: PrimitiveType = { kind: "int", name: "unsigned long long" };
export const T_BOOL: PrimitiveType = { kind: "bool" };

export function arrayType(elem: CType, length: number): ArrayType {
  return { kind: "array", elem, length };
}

export function pointerType(to: CType): PointerType {
  return { kind: "pointer", to };
}

export function structType(name: string, fields: readonly StructField[]): StructType {
  return { kind: "struct", name, fields };
}

export type IntInfo = {
  readonly size: number;
  readonly signed: boolean;
  readonly rank: number;
};

export type FieldLayout = {
  readonly name: string;
  readonly type: CType;
  readonly offset: number;
};

export type StructLayout = {
  readonly size: number;
  readonly align: number;
  readonly fields: readonly FieldLayout[];
};

export type PointerInit =
  | null
  | bigint
  | { readonly ref: string; readonly index?: number; readonly field?: string };

export type CValueInit =
  | number
  | bigint
  | boolean
  | string
  | PointerInit
  | readonly CValueInit[]
  | { readonly [field: string]: CValueInit };

export type VariableSpec = {
  readonly name: string;
  readonly type: CType;
  readonly value: CValueInit;
};

export type VariableBinding = {
  readonly name: string;
  readonly type: CType;
  readonly addr: bigint;
};

export type MemoryState = {
  readonly baseAddr: bigint;
  readonly bytes: Uint8Array;
  readonly vars: ReadonlyMap<string, VariableBinding>;
  readonly types: ReadonlyMap<string, StructType>;
};

export class MemoryAccessError extends Error {
  readonly address: bigint;
  constructor(address: bigint) {
    super(`Cannot access memory at address 0x${address.toString(16)}`);
    this.name = "MemoryAccessError";
    this.address = address;
  }
}

/** Non-null synthetic base address so 0x0 is strictly reserved for nullptr. */
const BASE_ADDR = 0x10000n;

const INT_INFO: Readonly<Record<IntTypeName, IntInfo>> = {
  char: { size: 1, signed: true, rank: 1 },
  "signed char": { size: 1, signed: true, rank: 1 },
  "unsigned char": { size: 1, signed: false, rank: 1 },
  short: { size: 2, signed: true, rank: 2 },
  "unsigned short": { size: 2, signed: false, rank: 2 },
  int: { size: 4, signed: true, rank: 3 },
  "unsigned int": { size: 4, signed: false, rank: 3 },
  long: { size: 8, signed: true, rank: 4 },
  "unsigned long": { size: 8, signed: false, rank: 4 },
  "long long": { size: 8, signed: true, rank: 5 },
  "unsigned long long": { size: 8, signed: false, rank: 5 },
};

export function intInfo(name: IntTypeName): IntInfo {
  return INT_INFO[name];
}

export function isSignedType(type: CType): boolean {
  return type.kind === "int" && INT_INFO[type.name].signed;
}

function alignUp(offset: number, align: number): number {
  const rem = offset % align;
  return rem === 0 ? offset : offset + (align - rem);
}

export function alignOf(type: CType): number {
  switch (type.kind) {
    case "bool":
      return 1;
    case "int":
      return INT_INFO[type.name].size;
    case "pointer":
      return 8;
    case "array":
      return alignOf(type.elem);
    case "struct": {
      let maxAlign = 1;
      for (const f of type.fields) {
        maxAlign = Math.max(maxAlign, alignOf(f.type));
      }
      return maxAlign;
    }
  }
}

export function structLayout(type: StructType): StructLayout {
  const fields: FieldLayout[] = [];
  let offset = 0;
  let maxAlign = 1;
  for (const field of type.fields) {
    const fAlign = alignOf(field.type);
    const fSize = sizeOf(field.type);
    maxAlign = Math.max(maxAlign, fAlign);
    offset = alignUp(offset, fAlign);
    fields.push({ name: field.name, type: field.type, offset });
    offset += fSize;
  }
  const size = Math.max(1, alignUp(offset, maxAlign));
  return { size, align: maxAlign, fields };
}

export function sizeOf(type: CType): number {
  switch (type.kind) {
    case "bool":
      return 1;
    case "int":
      return INT_INFO[type.name].size;
    case "pointer":
      return 8;
    case "array":
      return sizeOf(type.elem) * type.length;
    case "struct":
      return structLayout(type).size;
  }
}

export function offsetOf(type: StructType, fieldName: string): number {
  const found = structLayout(type).fields.find((f) => f.name === fieldName);
  if (found === undefined) {
    throw new Error(`struct ${type.name} has no field "${fieldName}"`);
  }
  return found.offset;
}

export function typeName(type: CType): string {
  switch (type.kind) {
    case "bool":
      return "bool";
    case "int":
      return type.name;
    case "struct":
      return type.name;
    case "pointer":
      return type.to.kind === "pointer" ? `${typeName(type.to)}*` : `${typeName(type.to)} *`;
    case "array":
      return `${typeName(type.elem)} [${String(type.length)}]`;
  }
}

function formatFieldDecl(type: CType, name: string): string {
  if (type.kind === "pointer") {
    return `${typeName(type.to)} *${name}`;
  }
  if (type.kind === "array") {
    return `${typeName(type.elem)} ${name}[${String(type.length)}]`;
  }
  return `${typeName(type)} ${name}`;
}

export function ptypeString(type: CType): string {
  if (type.kind !== "struct") return `type = ${typeName(type)}`;
  const body = type.fields.map((f) => `    ${formatFieldDecl(f.type, f.name)};`).join("\n");
  return `type = struct ${type.name} {\n${body}\n}`;
}

export function writeLittleEndian(
  buf: Uint8Array,
  offset: number,
  size: number,
  value: bigint,
): void {
  let u = BigInt.asUintN(size * 8, value);
  for (let i = 0; i < size; i++) {
    buf[offset + i] = Number(u & 0xffn);
    u >>= 8n;
  }
}

export function readLittleEndian(
  buf: Uint8Array,
  offset: number,
  size: number,
  signed: boolean,
): bigint {
  let u = 0n;
  for (let i = size - 1; i >= 0; i--) {
    u = (u << 8n) | BigInt(buf[offset + i] ?? 0);
  }
  return signed ? BigInt.asIntN(size * 8, u) : u;
}

function collectStructs(type: CType, out: Map<string, StructType>): void {
  if (type.kind === "pointer") {
    collectStructs(type.to, out);
  } else if (type.kind === "array") {
    collectStructs(type.elem, out);
  } else if (type.kind === "struct" && !out.has(type.name)) {
    out.set(type.name, type);
    for (const f of type.fields) collectStructs(f.type, out);
  }
}

function resolvePointer(init: PointerInit, vars: ReadonlyMap<string, VariableBinding>): bigint {
  if (init === null) return 0n;
  if (typeof init === "bigint") return init;
  const target = vars.get(init.ref);
  if (target === undefined) {
    throw new Error(`unknown pointer target "${init.ref}"`);
  }
  let addr = target.addr;
  if (init.index !== undefined && target.type.kind === "array") {
    addr += BigInt(init.index * sizeOf(target.type.elem));
  }
  if (init.field !== undefined && target.type.kind === "struct") {
    addr += BigInt(offsetOf(target.type, init.field));
  }
  return addr;
}

function writeInit(
  buf: Uint8Array,
  offset: number,
  type: CType,
  value: CValueInit,
  vars: ReadonlyMap<string, VariableBinding>,
): void {
  if (type.kind === "bool") {
    const bit = typeof value === "boolean" ? (value ? 1n : 0n) : BigInt(value as number) !== 0n ? 1n : 0n;
    writeLittleEndian(buf, offset, 1, bit);
    return;
  }
  if (type.kind === "int") {
    const size = INT_INFO[type.name].size;
    const raw =
      typeof value === "string"
        ? BigInt(value.charCodeAt(0))
        : typeof value === "boolean"
          ? value
            ? 1n
            : 0n
          : BigInt(value as number | bigint);
    writeLittleEndian(buf, offset, size, raw);
    return;
  }
  if (type.kind === "pointer") {
    const addr = resolvePointer(value as PointerInit, vars);
    writeLittleEndian(buf, offset, 8, addr);
    return;
  }
  if (type.kind === "array") {
    const elemSize = sizeOf(type.elem);
    if (typeof value === "string") {
      for (let i = 0; i < type.length; i++) {
        const ch = i < value.length ? value.charCodeAt(i) : 0;
        writeLittleEndian(buf, offset + i * elemSize, elemSize, BigInt(ch));
      }
      return;
    }
    const list = value as readonly CValueInit[];
    for (let i = 0; i < type.length; i++) {
      if (i < list.length) {
        writeInit(buf, offset + i * elemSize, type.elem, list[i]!, vars);
      }
    }
    return;
  }
  const layout = structLayout(type);
  const rec = value as Readonly<Record<string, CValueInit>>;
  for (const field of layout.fields) {
    if (field.name in rec) {
      writeInit(buf, offset + field.offset, field.type, rec[field.name]!, vars);
    }
  }
}

export function buildMemoryState(
  specs: readonly VariableSpec[],
  extraTypes: readonly StructType[] = [],
): MemoryState {
  const types = new Map<string, StructType>();
  for (const t of extraTypes) collectStructs(t, types);
  for (const spec of specs) collectStructs(spec.type, types);

  const vars = new Map<string, VariableBinding>();
  let cursor = 0;
  for (const spec of specs) {
    const align = Math.max(8, alignOf(spec.type));
    cursor = alignUp(cursor, align);
    vars.set(spec.name, { name: spec.name, type: spec.type, addr: BASE_ADDR + BigInt(cursor) });
    cursor += sizeOf(spec.type);
  }

  const bytes = new Uint8Array(Math.max(1, cursor));
  for (const spec of specs) {
    const binding = vars.get(spec.name)!;
    const offset = Number(binding.addr - BASE_ADDR);
    writeInit(bytes, offset, spec.type, spec.value, vars);
  }

  return { baseAddr: BASE_ADDR, bytes, vars, types };
}

export function readBytes(state: MemoryState, addr: bigint, count: number): Uint8Array {
  if (addr === 0n) {
    throw new MemoryAccessError(0n);
  }
  const rel = addr - state.baseAddr;
  if (rel < 0n || rel + BigInt(count) > BigInt(state.bytes.length)) {
    throw new MemoryAccessError(addr);
  }
  const start = Number(rel);
  return state.bytes.subarray(start, start + count);
}

export function readScalar(
  state: MemoryState,
  addr: bigint,
  type: PrimitiveType | PointerType,
): bigint {
  const size = sizeOf(type);
  const slice = readBytes(state, addr, size);
  if (type.kind === "bool") {
    return (slice[0] ?? 0) !== 0 ? 1n : 0n;
  }
  return readLittleEndian(slice, 0, size, isSignedType(type));
}

export function variableBytes(state: MemoryState, name: string): Uint8Array {
  const binding = state.vars.get(name);
  if (binding === undefined) {
    throw new Error(`unknown variable "${name}"`);
  }
  return readBytes(state, binding.addr, sizeOf(binding.type));
}
