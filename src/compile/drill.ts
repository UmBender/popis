import { createRng, deriveSeed, type Rng } from "../core/rng";
import { casesForGroups, type CompileCase } from "./cases";
import { causeById, causesForGroup, type CauseId, type CompileGroup } from "./causes";

export type CompileChoice = {
  readonly id: CauseId;
  readonly label: string;
};

export type CompileItem = {
  readonly index: number;
  readonly seed: number;
  readonly caseData: CompileCase;
  readonly group: CompileGroup;
  readonly kc: `compile.${CompileGroup}`;
  readonly choices: readonly [CompileChoice, CompileChoice, CompileChoice, CompileChoice];
  readonly correctChoiceIndex: 1 | 2 | 3 | 4;
};

export type CompileAnswer = {
  readonly line: number;
  readonly cause: CauseId;
};

export type CompileCheckResult = {
  readonly ok: boolean;
  readonly lineOk: boolean;
  readonly causeOk: boolean;
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

/** Deterministic drill item generator: no repeats within a cycle, 4 shuffled causes from the same group. */
export function generateCompileItem(
  seed: number,
  index: number,
  groups: readonly CompileGroup[],
): CompileItem {
  const pool = casesForGroups(groups);
  const cycle = Math.floor(index / pool.length);
  const pos = index % pool.length;
  const order = shuffle(pool, createRng(deriveSeed(seed, cycle * 9973 + 1)));
  const caseData = order[pos]!;

  const itemSeed = deriveSeed(seed, index);
  const rng = createRng(itemSeed);
  const correct = causeById(caseData.cause);
  const distractors = shuffle(
    causesForGroup(caseData.group).filter((c) => c.id !== caseData.cause),
    rng,
  ).slice(0, 3);

  const shuffledChoices = shuffle(
    [correct, ...distractors].map((c): CompileChoice => ({ id: c.id, label: c.label })),
    rng,
  );
  const choices: readonly [CompileChoice, CompileChoice, CompileChoice, CompileChoice] = [
    shuffledChoices[0]!,
    shuffledChoices[1]!,
    shuffledChoices[2]!,
    shuffledChoices[3]!,
  ];
  const correctChoiceIndex = (choices.findIndex((c) => c.id === caseData.cause) + 1) as
    | 1
    | 2
    | 3
    | 4;

  return {
    index,
    seed: itemSeed,
    caseData,
    group: caseData.group,
    kc: `compile.${caseData.group}`,
    choices,
    correctChoiceIndex,
  };
}

export function checkCompileAnswer(item: CompileItem, answer: CompileAnswer): CompileCheckResult {
  const lineOk = answer.line === item.caseData.line;
  const causeOk = answer.cause === item.caseData.cause;
  return { ok: lineOk && causeOk, lineOk, causeOk };
}
