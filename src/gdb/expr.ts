import type { CType, MemoryState } from "./memory";

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

export function parseTypeExpr(_input: string, _state: MemoryState): CType {
  throw new Error("todo");
}

export function evalExpr(_input: string, _state: MemoryState): EvalValue {
  throw new Error("todo");
}
