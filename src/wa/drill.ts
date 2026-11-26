import type { WaCase } from "./cases";
import type { WaClass } from "./classes";

export type WaChoice = {
  readonly id: WaClass;
  readonly label: string;
};

export type WaItem = {
  readonly index: number;
  readonly seed: number;
  readonly caseData: WaCase;
  readonly bugClass: WaClass;
  readonly kc: `wa.${WaClass}`;
  readonly choices: readonly [WaChoice, WaChoice, WaChoice, WaChoice];
  readonly correctChoiceIndex: 1 | 2 | 3 | 4;
};

export type WaAnswer = {
  readonly line: number;
  readonly bugClass: WaClass;
};

export type WaCheckResult = {
  readonly ok: boolean;
  readonly lineOk: boolean;
  readonly classOk: boolean;
};

export function generateWaItem(
  _seed: number,
  _index: number,
  _classes: readonly WaClass[],
): WaItem {
  throw new Error("todo");
}

export function checkWaAnswer(_item: WaItem, _answer: WaAnswer): WaCheckResult {
  throw new Error("todo");
}
