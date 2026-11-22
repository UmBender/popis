import type { EvalValue } from "./expr";
import type { CType, MemoryState } from "./memory";

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

export function formatCharLiteral(_byte: number, _quote: "'" | '"'): string {
  throw new Error("todo");
}

export function formatValue(
  _val: EvalValue,
  _state: MemoryState,
  _fmt?: PrintFormat,
  _opts?: FormatOptions,
): string {
  throw new Error("todo");
}

export function formatWhatis(_type: CType): string {
  throw new Error("todo");
}

export function formatPtype(_type: CType): string {
  throw new Error("todo");
}

export function formatExamine(
  _state: MemoryState,
  _addr: bigint,
  _count: number,
  _fmt: ExamineFormat,
  _unit: ExamineUnit,
): string {
  throw new Error("todo");
}

export function evalGdbCommand(_cmd: string, _state: MemoryState): FormatCommandResult {
  throw new Error("todo");
}
