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

export function intInfo(_name: IntTypeName): IntInfo {
  throw new Error("todo");
}

export function isSignedType(_type: CType): boolean {
  throw new Error("todo");
}

export function alignOf(_type: CType): number {
  throw new Error("todo");
}

export function sizeOf(_type: CType): number {
  throw new Error("todo");
}

export function structLayout(_type: StructType): StructLayout {
  throw new Error("todo");
}

export function offsetOf(_type: StructType, _fieldName: string): number {
  throw new Error("todo");
}

export function typeName(_type: CType): string {
  throw new Error("todo");
}

export function ptypeString(_type: CType): string {
  throw new Error("todo");
}

export function writeLittleEndian(
  _buf: Uint8Array,
  _offset: number,
  _size: number,
  _value: bigint,
): void {
  throw new Error("todo");
}

export function readLittleEndian(
  _buf: Uint8Array,
  _offset: number,
  _size: number,
  _signed: boolean,
): bigint {
  throw new Error("todo");
}

export function buildMemoryState(
  _vars: readonly VariableSpec[],
  _extraTypes?: readonly StructType[],
): MemoryState {
  throw new Error("todo");
}

export function readBytes(_state: MemoryState, _addr: bigint, _count: number): Uint8Array {
  throw new Error("todo");
}

export function readScalar(
  _state: MemoryState,
  _addr: bigint,
  _type: PrimitiveType | PointerType,
): bigint {
  throw new Error("todo");
}

export function variableBytes(_state: MemoryState, _name: string): Uint8Array {
  throw new Error("todo");
}
