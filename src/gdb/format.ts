import { evalExpr, parseTypeExpr, type EvalValue } from "./expr";
import {
  MemoryAccessError,
  isSignedType,
  ptypeString,
  readBytes,
  readLittleEndian,
  readScalar,
  sizeOf,
  structLayout,
  typeName,
  type CType,
  type MemoryState,
} from "./memory";

export type PrintFormat = "x" | "d" | "u" | "o" | "t" | "c";
export type ExamineFormat = "x" | "d" | "u" | "t" | "c" | "s" | "o";
export type ExamineUnit = "b" | "h" | "w" | "g";

export const DEFAULT_PRINT_ELEMENTS = 200;
export const DEFAULT_PRINT_REPEATS = 10;

export type FormatOptions = {
  readonly elements?: number;
  readonly repeats?: number;
  readonly topLevel?: boolean;
};

export type FormatCommandKind = "print" | "examine" | "whatis" | "ptype" | "error";

export type FormatCommandResult =
  | { readonly ok: true; readonly kind: FormatCommandKind; readonly output: string }
  | { readonly ok: false; readonly error: string };

const UNIT_SIZES: Readonly<Record<ExamineUnit, number>> = { b: 1, h: 2, w: 4, g: 8 };
const PRINT_FORMATS = new Set<string>(["x", "d", "u", "o", "t", "c"]);
const EXAMINE_FORMATS = new Set<string>(["x", "d", "u", "t", "c", "s", "o"]);
const EXAMINE_UNITS = new Set<string>(["b", "h", "w", "g"]);

export function formatCharLiteral(byte: number, quote: "'" | '"'): string {
  const b = byte & 0xff;
  switch (b) {
    case 0:
      return "\\000";
    case 7:
      return "\\a";
    case 8:
      return "\\b";
    case 9:
      return "\\t";
    case 10:
      return "\\n";
    case 11:
      return "\\v";
    case 12:
      return "\\f";
    case 13:
      return "\\r";
    case 92:
      return "\\\\";
    case 39:
      return quote === "'" ? "\\'" : "'";
    case 34:
      return quote === '"' ? '\\"' : '"';
    default:
      if (b >= 32 && b <= 126) return String.fromCharCode(b);
      return `\\${b.toString(8).padStart(3, "0")}`;
  }
}

function isCharLike(type: CType): boolean {
  return (
    type.kind === "int" &&
    (type.name === "char" || type.name === "signed char" || type.name === "unsigned char")
  );
}

function formatByteAsChar(byte: number, signed: boolean): string {
  const b = byte & 0xff;
  const num = signed ? (b >= 128 ? b - 256 : b) : b;
  return `${String(num)} '${formatCharLiteral(b, "'")}'`;
}

function formatScalar(
  raw: bigint,
  type: CType,
  fmt: PrintFormat | undefined,
  topLevel: boolean,
): string {
  const bits = sizeOf(type) * 8;
  const u = BigInt.asUintN(bits, raw);
  const s = BigInt.asIntN(bits, raw);

  if (fmt === "x") {
    if (type.kind === "pointer") return u === 0n ? "0x0" : "ADDR";
    return `0x${u.toString(16)}`;
  }
  if (fmt === "d") return s.toString(10);
  if (fmt === "u") return u.toString(10);
  if (fmt === "o") return u === 0n ? "0" : `0${u.toString(8)}`;
  if (fmt === "t") return u.toString(2);
  if (fmt === "c") return formatByteAsChar(Number(u & 0xffn), isSignedType(type));

  if (type.kind === "bool") return u !== 0n ? "true" : "false";
  if (type.kind === "pointer") {
    const addr = u === 0n ? "0x0" : "ADDR";
    return topLevel ? `(${typeName(type)}) ${addr}` : addr;
  }
  if (isCharLike(type)) {
    return formatByteAsChar(Number(u & 0xffn), isSignedType(type));
  }
  return isSignedType(type) ? s.toString(10) : u.toString(10);
}

function formatCharArray(bytes: Uint8Array, elements: number, repeats: number): string {
  const effLen =
    bytes.length > 0 && bytes[bytes.length - 1] === 0 ? bytes.length - 1 : bytes.length;
  if (effLen === 0) return '""';

  const parts: string[] = [];
  let inString = false;
  let strBuf = "";
  let printed = 0;
  let truncated = false;
  let i = 0;

  const flushString = () => {
    if (inString) {
      parts.push(`"${strBuf}"`);
      strBuf = "";
      inString = false;
    }
  };

  while (i < effLen) {
    if (printed >= elements) {
      truncated = true;
      break;
    }
    const b = bytes[i]!;
    let run = 1;
    while (i + run < effLen && bytes[i + run] === b) run += 1;

    if (run > repeats) {
      flushString();
      parts.push(`'${formatCharLiteral(b, "'")}' <repeats ${String(run)} times>`);
      printed += 1;
      i += run;
    } else {
      inString = true;
      strBuf += formatCharLiteral(b, '"');
      printed += 1;
      i += 1;
    }
  }

  flushString();
  return `${parts.join(", ")}${truncated ? "..." : ""}`;
}

function bytesEqualAt(buf: Uint8Array, a: number, b: number, len: number): boolean {
  for (let k = 0; k < len; k++) {
    if (buf[a + k] !== buf[b + k]) return false;
  }
  return true;
}

function formatAt(
  addr: bigint,
  type: CType,
  state: MemoryState,
  fmt: PrintFormat | undefined,
  elements: number,
  repeats: number,
  topLevel: boolean,
): string {
  if (type.kind === "array") {
    return formatArrayElements(type.elem, type.length, addr, state, fmt, elements, repeats);
  }
  if (type.kind === "struct") {
    const layout = structLayout(type);
    const entries = layout.fields.map((f) => {
      const fStr = formatAt(addr + BigInt(f.offset), f.type, state, fmt, elements, repeats, false);
      return `${f.name} = ${fStr}`;
    });
    return `{${entries.join(", ")}}`;
  }
  const raw = readScalar(state, addr, type);
  return formatScalar(raw, type, fmt, topLevel);
}

function formatArrayElements(
  elem: CType,
  length: number,
  addr: bigint,
  state: MemoryState,
  fmt: PrintFormat | undefined,
  elements: number,
  repeats: number,
): string {
  if (fmt === undefined && elem.kind === "int" && elem.name === "char") {
    const raw = readBytes(state, addr, length);
    return formatCharArray(raw, elements, repeats);
  }

  const elemSize = sizeOf(elem);
  const raw = readBytes(state, addr, length * elemSize);
  const items: string[] = [];
  let printed = 0;
  let truncated = false;
  let i = 0;

  while (i < length) {
    if (printed >= elements) {
      truncated = true;
      break;
    }
    let run = 1;
    while (i + run < length && bytesEqualAt(raw, i * elemSize, (i + run) * elemSize, elemSize)) {
      run += 1;
    }
    const elemStr = formatAt(
      addr + BigInt(i * elemSize),
      elem,
      state,
      fmt,
      elements,
      repeats,
      false,
    );
    if (run > repeats) {
      items.push(`${elemStr} <repeats ${String(run)} times>`);
      printed += 1;
      i += run;
    } else {
      items.push(elemStr);
      printed += 1;
      i += 1;
    }
  }

  return `{${items.join(", ")}${truncated ? "..." : ""}}`;
}

export function formatValue(
  val: EvalValue,
  state: MemoryState,
  fmt?: PrintFormat,
  opts?: FormatOptions,
): string {
  const elements = opts?.elements ?? DEFAULT_PRINT_ELEMENTS;
  const repeats = opts?.repeats ?? DEFAULT_PRINT_REPEATS;
  const topLevel = opts?.topLevel ?? true;

  if (val.kind === "scalar") {
    return formatScalar(val.raw, val.type, fmt, topLevel);
  }
  if (val.kind === "synthetic-array") {
    return formatArrayElements(val.elem, val.length, val.addr, state, fmt, elements, repeats);
  }
  return formatAt(val.addr, val.type, state, fmt, elements, repeats, topLevel);
}

export function formatWhatis(type: CType): string {
  return `type = ${typeName(type)}`;
}

export function formatPtype(type: CType): string {
  return ptypeString(type);
}

export function formatExamine(
  state: MemoryState,
  addr: bigint,
  count: number,
  fmt: ExamineFormat,
  unit: ExamineUnit,
): string {
  if (fmt === "s") {
    const out: string[] = [];
    for (let i = 0; i < count; i++) {
      let cur = addr;
      let s = "";
      let steps = 0;
      while (steps < DEFAULT_PRINT_ELEMENTS) {
        const b = readBytes(state, cur, 1)[0]!;
        cur += 1n;
        if (b === 0) break;
        s += formatCharLiteral(b, '"');
        steps += 1;
      }
      out.push(`"${s}"`);
    }
    return out.join(" ");
  }

  const unitSize = UNIT_SIZES[unit];
  const bytes = readBytes(state, addr, count * unitSize);
  const items: string[] = [];
  for (let i = 0; i < count; i++) {
    const off = i * unitSize;
    const u = readLittleEndian(bytes, off, unitSize, false);
    const s = readLittleEndian(bytes, off, unitSize, true);
    switch (fmt) {
      case "x":
        items.push(`0x${u.toString(16).padStart(unitSize * 2, "0")}`);
        break;
      case "t":
        items.push(u.toString(2).padStart(unitSize * 8, "0"));
        break;
      case "d":
        items.push(s.toString(10));
        break;
      case "u":
        items.push(u.toString(10));
        break;
      case "o":
        items.push(u === 0n ? "0" : `0${u.toString(8)}`);
        break;
      case "c":
        items.push(formatByteAsChar(Number(u & 0xffn), true));
        break;
    }
  }
  return items.join(" ");
}

function parseExamineSpec(
  spec: string,
): { readonly count: number; readonly fmt: ExamineFormat; readonly unit: ExamineUnit } | null {
  let i = 0;
  let digits = "";
  while (i < spec.length && /[0-9]/.test(spec[i]!)) {
    digits += spec[i]!;
    i += 1;
  }
  const count = digits.length > 0 ? Number(digits) : 1;
  if (!Number.isInteger(count) || count <= 0) return null;

  let fmt: ExamineFormat = "x";
  let unit: ExamineUnit = "w";
  for (; i < spec.length; i++) {
    const ch = spec[i]!;
    if (EXAMINE_FORMATS.has(ch)) {
      fmt = ch as ExamineFormat;
    } else if (EXAMINE_UNITS.has(ch)) {
      unit = ch as ExamineUnit;
    } else {
      return null;
    }
  }
  return { count, fmt, unit };
}

function resolveTypeOrExpr(arg: string, state: MemoryState): CType {
  try {
    return parseTypeExpr(arg, state);
  } catch {
    const val = evalExpr(arg, state);
    return val.kind === "synthetic-array" ? val.elem : val.type;
  }
}

export function evalGdbCommand(cmd: string, state: MemoryState): FormatCommandResult {
  const trimmed = cmd.trim();
  if (trimmed.length === 0) return { ok: false, error: "empty command" };

  try {
    // whatis <expr|type>
    const whatisMatch = /^whatis\s+(.+)$/.exec(trimmed);
    if (whatisMatch !== null) {
      return {
        ok: true,
        kind: "whatis",
        output: formatWhatis(resolveTypeOrExpr(whatisMatch[1]!, state)),
      };
    }

    // ptype <expr|type>
    const ptypeMatch = /^ptype\s+(.+)$/.exec(trimmed);
    if (ptypeMatch !== null) {
      return {
        ok: true,
        kind: "ptype",
        output: formatPtype(resolveTypeOrExpr(ptypeMatch[1]!, state)),
      };
    }

    // x/<spec> <expr>
    const xMatch = /^x(?:\/([0-9a-z]+))?\s+(.+)$/.exec(trimmed);
    if (xMatch !== null) {
      const spec = parseExamineSpec(xMatch[1] ?? "1xw");
      if (spec === null) return { ok: false, error: `invalid examine format "${xMatch[1] ?? ""}"` };
      const target = evalExpr(xMatch[2]!, state);
      const addr =
        target.kind === "aggregate"
          ? target.addr
          : target.kind === "scalar"
            ? target.raw
            : target.addr;
      return {
        ok: true,
        kind: "examine",
        output: formatExamine(state, addr, spec.count, spec.fmt, spec.unit),
      };
    }

    // p[/fmt] <expr> or print[/fmt] <expr>
    const pMatch = /^(?:p|print)(?:\/([a-z]+))?\s+(.+)$/.exec(trimmed);
    if (pMatch !== null) {
      const fmtRaw = pMatch[1];
      if (fmtRaw !== undefined && !PRINT_FORMATS.has(fmtRaw)) {
        return { ok: false, error: `unknown print format "/${fmtRaw}"` };
      }
      const val = evalExpr(pMatch[2]!, state);
      return {
        ok: true,
        kind: "print",
        output: formatValue(val, state, fmtRaw as PrintFormat | undefined, { topLevel: true }),
      };
    }

    return { ok: false, error: `unsupported command "${trimmed}"` };
  } catch (err) {
    if (err instanceof MemoryAccessError) {
      return { ok: true, kind: "error", output: err.message };
    }
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
