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
  intInfo,
  isSignedType,
  offsetOf,
  pointerType,
  readBytes,
  readScalar,
  sizeOf,
  type CType,
  type IntTypeName,
  type MemoryState,
  type PointerType,
  type PrimitiveType,
} from "./memory";

export type EvalValue =
  | { readonly kind: "scalar"; readonly type: CType; readonly raw: bigint; readonly addr?: bigint }
  | { readonly kind: "aggregate"; readonly type: CType; readonly addr: bigint }
  | {
      readonly kind: "synthetic-array";
      readonly elem: CType;
      readonly length: number;
      readonly addr: bigint;
    };

export class ExprError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExprError";
  }
}

type Token =
  | {
      readonly kind: "int";
      readonly value: bigint;
      readonly unsigned: boolean;
      readonly longCount: number;
    }
  | { readonly kind: "char"; readonly value: number }
  | { readonly kind: "ident"; readonly value: string }
  | { readonly kind: "op"; readonly value: string };

const ESCAPE_MAP: Readonly<Record<string, number>> = {
  n: 10,
  t: 9,
  r: 13,
  a: 7,
  b: 8,
  f: 12,
  v: 11,
  "0": 0,
  "\\": 92,
  "'": 39,
  '"': 34,
};

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const n = input.length;

  while (i < n) {
    const ch = input[i]!;
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }
    if (ch === "-" && input[i + 1] === ">") {
      tokens.push({ kind: "op", value: "->" });
      i += 2;
      continue;
    }
    if ("+-*/%()[].&@".includes(ch)) {
      tokens.push({ kind: "op", value: ch });
      i += 1;
      continue;
    }
    if (ch === "'") {
      i += 1;
      let code: number;
      if (input[i] === "\\") {
        i += 1;
        const esc = input[i] ?? "";
        const mapped = ESCAPE_MAP[esc];
        if (mapped === undefined) throw new ExprError(`unsupported char escape \\${esc}`);
        code = mapped;
        i += 1;
      } else {
        code = input.charCodeAt(i);
        i += 1;
      }
      if (input[i] !== "'") throw new ExprError("unterminated char literal");
      i += 1;
      tokens.push({ kind: "char", value: code });
      continue;
    }
    if (/[0-9]/.test(ch)) {
      const start = i;
      if (ch === "0" && (input[i + 1] === "x" || input[i + 1] === "X")) {
        i += 2;
        while (i < n && /[0-9a-fA-F]/.test(input[i]!)) i += 1;
      } else {
        while (i < n && /[0-9]/.test(input[i]!)) i += 1;
      }
      const digits = input.slice(start, i);
      let unsigned = false;
      let longCount = 0;
      while (i < n && /[uUlL]/.test(input[i]!)) {
        const s = input[i]!.toLowerCase();
        if (s === "u") unsigned = true;
        else longCount += 1;
        i += 1;
      }
      const value =
        digits.startsWith("0x") || digits.startsWith("0X")
          ? BigInt(digits)
          : digits.length > 1 && digits.startsWith("0")
            ? BigInt(`0o${digits.slice(1)}`)
            : BigInt(digits);
      tokens.push({ kind: "int", value, unsigned, longCount });
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      const start = i;
      while (i < n && /[A-Za-z0-9_]/.test(input[i]!)) i += 1;
      tokens.push({ kind: "ident", value: input.slice(start, i) });
      continue;
    }
    throw new ExprError(`unexpected character "${ch}"`);
  }

  return tokens;
}

function intLiteralType(value: bigint, unsigned: boolean, longCount: number): PrimitiveType {
  if (longCount >= 2) return unsigned ? T_ULLONG : T_LLONG;
  if (longCount === 1) return unsigned ? T_ULONG : T_LONG;
  if (unsigned) return value <= 0xffffffffn ? T_UINT : T_ULONG;
  return value <= 0x7fffffffn ? T_INT : T_LONG;
}

function normalizeToType(raw: bigint, type: CType): bigint {
  if (type.kind === "bool") return raw !== 0n ? 1n : 0n;
  if (type.kind === "pointer") return BigInt.asUintN(64, raw);
  if (type.kind === "int") {
    const info = intInfo(type.name);
    return info.signed ? BigInt.asIntN(info.size * 8, raw) : BigInt.asUintN(info.size * 8, raw);
  }
  throw new ExprError("cannot convert value to aggregate type");
}

function integerPromote(type: CType): { readonly kind: "int"; readonly name: IntTypeName } {
  if (type.kind === "bool") return { kind: "int", name: "int" };
  if (type.kind === "int") {
    const info = intInfo(type.name);
    if (info.rank < intInfo("int").rank) return { kind: "int", name: "int" };
    return type;
  }
  throw new ExprError("expected integer operand");
}

function commonArithType(a: CType, b: CType): PrimitiveType {
  const ta = integerPromote(a);
  const tb = integerPromote(b);
  if (ta.name === tb.name) return ta;
  const ia = intInfo(ta.name);
  const ib = intInfo(tb.name);
  if (ia.signed === ib.signed) {
    return ia.rank >= ib.rank ? ta : tb;
  }
  const [uType, uInfo, sType, sInfo] = ia.signed ? [tb, ib, ta, ia] : [ta, ia, tb, ib];
  if (uInfo.rank >= sInfo.rank) return uType;
  if (sInfo.size > uInfo.size) return sType;
  return T_ULLONG;
}

const TYPE_KEYWORDS = new Set([
  "bool",
  "char",
  "signed",
  "unsigned",
  "short",
  "int",
  "long",
  "struct",
]);

function resolveIntKeywords(words: readonly string[]): PrimitiveType | null {
  const key = words.join(" ");
  const map: Readonly<Record<string, PrimitiveType>> = {
    bool: T_BOOL,
    char: T_CHAR,
    "signed char": T_SCHAR,
    "unsigned char": T_UCHAR,
    short: T_SHORT,
    "short int": T_SHORT,
    "signed short": T_SHORT,
    "unsigned short": T_USHORT,
    "unsigned short int": T_USHORT,
    int: T_INT,
    signed: T_INT,
    "signed int": T_INT,
    unsigned: T_UINT,
    "unsigned int": T_UINT,
    long: T_LONG,
    "long int": T_LONG,
    "signed long": T_LONG,
    "unsigned long": T_ULONG,
    "unsigned long int": T_ULONG,
    "long long": T_LLONG,
    "long long int": T_LLONG,
    "signed long long": T_LLONG,
    "unsigned long long": T_ULLONG,
    "unsigned long long int": T_ULLONG,
  };
  return map[key] ?? null;
}

class Parser {
  private readonly tokens: readonly Token[];
  private readonly state: MemoryState;
  private pos = 0;

  constructor(tokens: readonly Token[], state: MemoryState) {
    this.tokens = tokens;
    this.state = state;
  }

  private peek(offset = 0): Token | undefined {
    return this.tokens[this.pos + offset];
  }

  private matchOp(op: string): boolean {
    const t = this.peek();
    if (t?.kind === "op" && t.value === op) {
      this.pos += 1;
      return true;
    }
    return false;
  }

  private expectOp(op: string): void {
    if (!this.matchOp(op)) {
      throw new ExprError(`expected "${op}"`);
    }
  }

  done(): boolean {
    return this.pos >= this.tokens.length;
  }

  tryParseType(): CType | null {
    const saved = this.pos;
    const first = this.peek();
    if (first?.kind !== "ident") return null;

    let base: CType | null = null;
    if (first.value === "struct") {
      this.pos += 1;
      const nameTok = this.peek();
      if (nameTok?.kind === "ident") {
        const st = this.state.types.get(nameTok.value);
        if (st !== undefined) {
          this.pos += 1;
          base = st;
        }
      }
    } else if (TYPE_KEYWORDS.has(first.value)) {
      const words: string[] = [];
      while (true) {
        const t = this.peek();
        if (t?.kind === "ident" && TYPE_KEYWORDS.has(t.value) && t.value !== "struct") {
          words.push(t.value);
          this.pos += 1;
        } else {
          break;
        }
      }
      base = resolveIntKeywords(words);
    } else {
      const st = this.state.types.get(first.value);
      if (st !== undefined) {
        this.pos += 1;
        base = st;
      }
    }

    if (base === null) {
      this.pos = saved;
      return null;
    }
    while (this.matchOp("*")) {
      base = pointerType(base);
    }
    return base;
  }

  parseExpr(): EvalValue {
    return this.parseAdd();
  }

  private asPointerOrDecay(v: EvalValue): { addr: bigint; target: CType } | null {
    if (v.kind === "aggregate" && v.type.kind === "array") {
      return { addr: v.addr, target: v.type.elem };
    }
    if (v.kind === "scalar" && v.type.kind === "pointer") {
      return { addr: v.raw, target: v.type.to };
    }
    return null;
  }

  private parseAdd(): EvalValue {
    let left = this.parseMul();
    while (true) {
      const isAdd = this.matchOp("+");
      const isSub = !isAdd && this.matchOp("-");
      if (!isAdd && !isSub) break;
      const right = this.parseMul();

      const lp = this.asPointerOrDecay(left);
      const rp = this.asPointerOrDecay(right);
      if (lp !== null && right.kind === "scalar" && right.type.kind !== "pointer") {
        const step = BigInt(sizeOf(lp.target));
        const nextAddr = isAdd ? lp.addr + right.raw * step : lp.addr - right.raw * step;
        left = { kind: "scalar", type: pointerType(lp.target), raw: BigInt.asUintN(64, nextAddr) };
        continue;
      }
      if (isAdd && rp !== null && left.kind === "scalar" && left.type.kind !== "pointer") {
        const step = BigInt(sizeOf(rp.target));
        const nextAddr = rp.addr + left.raw * step;
        left = { kind: "scalar", type: pointerType(rp.target), raw: BigInt.asUintN(64, nextAddr) };
        continue;
      }

      if (left.kind !== "scalar" || right.kind !== "scalar") {
        throw new ExprError("invalid operands to +/-");
      }
      const resType = commonArithType(left.type, right.type);
      const lv = normalizeToType(left.raw, resType);
      const rv = normalizeToType(right.raw, resType);
      const raw = normalizeToType(isAdd ? lv + rv : lv - rv, resType);
      left = { kind: "scalar", type: resType, raw };
    }
    return left;
  }

  private parseMul(): EvalValue {
    let left = this.parseAt();
    while (true) {
      const op = this.matchOp("*") ? "*" : this.matchOp("/") ? "/" : this.matchOp("%") ? "%" : null;
      if (op === null) break;
      const right = this.parseAt();
      if (left.kind !== "scalar" || right.kind !== "scalar") {
        throw new ExprError(`invalid operands to ${op}`);
      }
      const resType = commonArithType(left.type, right.type);
      const lv = normalizeToType(left.raw, resType);
      const rv = normalizeToType(right.raw, resType);
      if ((op === "/" || op === "%") && rv === 0n) {
        throw new ExprError("division by zero");
      }
      const computed = op === "*" ? lv * rv : op === "/" ? lv / rv : lv % rv;
      left = { kind: "scalar", type: resType, raw: normalizeToType(computed, resType) };
    }
    return left;
  }

  private parseAt(): EvalValue {
    const left = this.parseCast();
    if (!this.matchOp("@")) return left;
    const countVal = this.parseCast();
    if (countVal.kind !== "scalar" || countVal.raw < 0n) {
      throw new ExprError("invalid @ length");
    }
    const addr =
      left.kind === "scalar" ? left.addr : left.kind === "aggregate" ? left.addr : undefined;
    const elemType = left.kind === "synthetic-array" ? left.elem : left.type;
    if (addr === undefined) {
      throw new ExprError("left operand of @ must be in memory");
    }
    const length = Number(countVal.raw);
    if (length > 0) {
      readBytes(this.state, addr, length * sizeOf(elemType));
    }
    return { kind: "synthetic-array", elem: elemType, length, addr };
  }

  private parseCast(): EvalValue {
    if (this.peek()?.kind === "op" && this.peek()?.value === "(") {
      const saved = this.pos;
      this.pos += 1;
      const targetType = this.tryParseType();
      if (targetType !== null && this.matchOp(")")) {
        const inner = this.parseCast();
        if (inner.kind !== "scalar") {
          throw new ExprError("cannot cast aggregate");
        }
        return { kind: "scalar", type: targetType, raw: normalizeToType(inner.raw, targetType) };
      }
      this.pos = saved;
    }
    return this.parseUnary();
  }

  private readAt(addr: bigint, type: CType): EvalValue {
    if (type.kind === "array" || type.kind === "struct") {
      readBytes(this.state, addr, sizeOf(type));
      return { kind: "aggregate", type, addr };
    }
    const raw = readScalar(this.state, addr, type);
    return { kind: "scalar", type, raw, addr };
  }

  private parseUnary(): EvalValue {
    const tok = this.peek();
    if (tok?.kind === "ident" && tok.value === "sizeof") {
      this.pos += 1;
      if (this.matchOp("(")) {
        const saved = this.pos;
        const t = this.tryParseType();
        if (t !== null && this.matchOp(")")) {
          return { kind: "scalar", type: T_ULONG, raw: BigInt(sizeOf(t)) };
        }
        this.pos = saved;
        const inner = this.parseExpr();
        this.expectOp(")");
        const t2 = inner.kind === "synthetic-array" ? inner.elem : inner.type;
        const sz = inner.kind === "synthetic-array" ? sizeOf(t2) * inner.length : sizeOf(t2);
        return { kind: "scalar", type: T_ULONG, raw: BigInt(sz) };
      }
      const inner = this.parseUnary();
      const t = inner.kind === "synthetic-array" ? inner.elem : inner.type;
      return { kind: "scalar", type: T_ULONG, raw: BigInt(sizeOf(t)) };
    }
    if (this.matchOp("-")) {
      const inner = this.parseCast();
      if (inner.kind !== "scalar") throw new ExprError("invalid operand to unary -");
      const promoted = integerPromote(inner.type);
      const val = normalizeToType(-normalizeToType(inner.raw, promoted), promoted);
      return { kind: "scalar", type: promoted, raw: val };
    }
    if (this.matchOp("+")) {
      const inner = this.parseCast();
      if (inner.kind !== "scalar") throw new ExprError("invalid operand to unary +");
      const promoted = integerPromote(inner.type);
      return { kind: "scalar", type: promoted, raw: normalizeToType(inner.raw, promoted) };
    }
    if (this.matchOp("*")) {
      const inner = this.parseCast();
      const ptr = this.asPointerOrDecay(inner);
      if (ptr === null) throw new ExprError("cannot dereference non-pointer");
      if (ptr.addr === 0n) throw new MemoryAccessError(0n);
      return this.readAt(ptr.addr, ptr.target);
    }
    if (this.matchOp("&")) {
      const inner = this.parseCast();
      if (inner.kind === "synthetic-array" || inner.addr === undefined) {
        throw new ExprError("cannot take address of rvalue");
      }
      const ptrType: PointerType = pointerType(inner.type);
      return { kind: "scalar", type: ptrType, raw: inner.addr };
    }
    return this.parsePostfix();
  }

  private parsePostfix(): EvalValue {
    let val = this.parsePrimary();
    while (true) {
      if (this.matchOp("[")) {
        const idxVal = this.parseExpr();
        this.expectOp("]");
        const ptr = this.asPointerOrDecay(val);
        if (ptr === null || idxVal.kind !== "scalar") {
          throw new ExprError("invalid subscript");
        }
        if (ptr.addr === 0n) throw new MemoryAccessError(0n);
        const elemAddr = ptr.addr + idxVal.raw * BigInt(sizeOf(ptr.target));
        val = this.readAt(elemAddr, ptr.target);
        continue;
      }
      if (this.matchOp(".")) {
        const fieldTok = this.peek();
        if (fieldTok?.kind !== "ident") throw new ExprError("expected field name");
        this.pos += 1;
        if (val.kind !== "aggregate" || val.type.kind !== "struct") {
          throw new ExprError("member access on non-struct");
        }
        const field = val.type.fields.find((f) => f.name === fieldTok.value);
        if (field === undefined) throw new ExprError(`unknown field "${fieldTok.value}"`);
        const fieldAddr = val.addr + BigInt(offsetOf(val.type, field.name));
        val = this.readAt(fieldAddr, field.type);
        continue;
      }
      if (this.matchOp("->")) {
        const fieldTok = this.peek();
        if (fieldTok?.kind !== "ident") throw new ExprError("expected field name");
        this.pos += 1;
        if (val.kind !== "scalar" || val.type.kind !== "pointer" || val.type.to.kind !== "struct") {
          throw new ExprError("-> requires pointer to struct");
        }
        if (val.raw === 0n) throw new MemoryAccessError(0n);
        const struct = val.type.to;
        const field = struct.fields.find((f) => f.name === fieldTok.value);
        if (field === undefined) throw new ExprError(`unknown field "${fieldTok.value}"`);
        const fieldAddr = val.raw + BigInt(offsetOf(struct, field.name));
        val = this.readAt(fieldAddr, field.type);
        continue;
      }
      break;
    }
    return val;
  }

  private parsePrimary(): EvalValue {
    const tok = this.peek();
    if (tok === undefined) throw new ExprError("unexpected end of expression");

    if (tok.kind === "int") {
      this.pos += 1;
      const type = intLiteralType(tok.value, tok.unsigned, tok.longCount);
      return { kind: "scalar", type, raw: normalizeToType(tok.value, type) };
    }
    if (tok.kind === "char") {
      this.pos += 1;
      return { kind: "scalar", type: T_CHAR, raw: normalizeToType(BigInt(tok.value), T_CHAR) };
    }
    if (tok.kind === "ident") {
      this.pos += 1;
      if (tok.value === "true") return { kind: "scalar", type: T_BOOL, raw: 1n };
      if (tok.value === "false") return { kind: "scalar", type: T_BOOL, raw: 0n };
      if (tok.value === "nullptr") {
        return { kind: "scalar", type: pointerType(T_CHAR), raw: 0n };
      }
      const binding = this.state.vars.get(tok.value);
      if (binding === undefined) {
        throw new ExprError(`unknown symbol "${tok.value}"`);
      }
      return this.readAt(binding.addr, binding.type);
    }
    if (this.matchOp("(")) {
      const inner = this.parseExpr();
      this.expectOp(")");
      return inner;
    }
    throw new ExprError(`unexpected token "${tok.value}"`);
  }
}

export function parseTypeExpr(input: string, state: MemoryState): CType {
  const tokens = tokenize(input);
  const parser = new Parser(tokens, state);
  const t = parser.tryParseType();
  if (t === null || !parser.done()) {
    throw new ExprError(`invalid type "${input}"`);
  }
  return t;
}

export function evalExpr(input: string, state: MemoryState): EvalValue {
  const tokens = tokenize(input);
  const parser = new Parser(tokens, state);
  const result = parser.parseExpr();
  if (!parser.done()) {
    throw new ExprError(`unexpected trailing tokens in "${input}"`);
  }
  return result;
}

export type { IntTypeName };
export { isSignedType };
