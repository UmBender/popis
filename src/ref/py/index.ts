import type { Entry, EntryDraft, Section } from "../model";
import { IO } from "./io";
import { ITER_FUNC } from "./iter_func";
import { NUMBERS } from "./numbers";
import { PY_OUTPUTS } from "./outputs";
import { PERF } from "./perf";
import { PITFALLS } from "./pitfalls";
import { RECURSION } from "./recursion";
import { SORTING } from "./sorting";
import { STRINGS } from "./strings";
import { STRUCTURES } from "./structures";

/** Each section in reading order, with its drafts. */
const TABLE: readonly (readonly [id: string, title: string, drafts: readonly EntryDraft[]])[] = [
  ["io", "Entrada e saída rápidas", IO],
  ["perf", "Desempenho", PERF],
  ["recursion", "Recursão", RECURSION],
  ["structures", "Estruturas", STRUCTURES],
  ["sorting", "Ordenação", SORTING],
  ["iter_func", "itertools e functools", ITER_FUNC],
  ["numbers", "Números", NUMBERS],
  ["strings", "Strings", STRINGS],
  ["pitfalls", "Armadilhas", PITFALLS],
];

/** The sections of the Python reference, in reading order (ADR-T47-1). */
export const PY_SECTIONS: readonly Section[] = TABLE.map(([id, title]) => ({
  id,
  lang: "py",
  title,
}));

/**
 * Every Python entry, grouped by section, with its recorded output. The oracle records
 * one output per entry, and `model.test.ts` fails when one is missing.
 */
export const PY_ENTRIES: readonly Entry[] = TABLE.flatMap(([section, , drafts]) =>
  drafts.map((draft) => ({
    ...draft,
    lang: "py" as const,
    section,
    output: PY_OUTPUTS[draft.id] as string,
  })),
);
