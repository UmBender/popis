import { createRng, deriveSeed, type Rng } from "../core/rng";
import { casesForClasses, type WaCase } from "./cases";
import { WA_CLASSES, waClassLabel, type WaClass } from "./classes";

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

function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    const tmp = copy[i]!;
    copy[i] = copy[j]!;
    copy[j] = tmp;
  }
  return copy;
}

/** Deterministic WA hunt item generator: no repeats within a cycle, 4 shuffled bug classes. */
export function generateWaItem(seed: number, index: number, classes: readonly WaClass[]): WaItem {
  const pool = casesForClasses(classes);
  const cycle = Math.floor(index / pool.length);
  const pos = index % pool.length;
  const order = shuffle(pool, createRng(deriveSeed(seed, cycle * 9973 + 1)));
  const caseData = order[pos]!;

  const itemSeed = deriveSeed(seed, index);
  const rng = createRng(itemSeed);
  const distractors = shuffle(
    WA_CLASSES.filter((c) => c !== caseData.class),
    rng,
  ).slice(0, 3);

  const shuffled = shuffle([caseData.class, ...distractors], rng).map((id): WaChoice => ({
    id,
    label: waClassLabel(id),
  }));
  const choices: readonly [WaChoice, WaChoice, WaChoice, WaChoice] = [
    shuffled[0]!,
    shuffled[1]!,
    shuffled[2]!,
    shuffled[3]!,
  ];
  const correctChoiceIndex = (choices.findIndex((c) => c.id === caseData.class) + 1) as
    1 | 2 | 3 | 4;

  return {
    index,
    seed: itemSeed,
    caseData,
    bugClass: caseData.class,
    kc: `wa.${caseData.class}`,
    choices,
    correctChoiceIndex,
  };
}

export function checkWaAnswer(item: WaItem, answer: WaAnswer): WaCheckResult {
  const lineOk = answer.line === item.caseData.line;
  const classOk = answer.bugClass === item.caseData.class;
  return { ok: lineOk && classOk, lineOk, classOk };
}
