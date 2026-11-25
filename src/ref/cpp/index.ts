import type { Entry, EntryDraft, Section } from "../model";
import { ALGORITHMS } from "./algorithms";
import { BITS } from "./bits";
import { CONTAINERS } from "./containers";
import { EXTRAS } from "./extras";
import { IO } from "./io";
import { MATH } from "./math";
import { CPP_OUTPUTS } from "./outputs";
import { RANDOM } from "./random";
import { STRINGS } from "./strings";
import { TYPES } from "./types";

/** Each section in reading order, with its drafts. */
const TABLE: readonly (readonly [id: string, title: string, drafts: readonly EntryDraft[]])[] = [
  ["io", "Template e I/O", IO],
  ["types", "Tipos e limites", TYPES],
  ["containers", "Contêineres", CONTAINERS],
  ["algorithms", "Algoritmos", ALGORITHMS],
  ["strings", "Strings", STRINGS],
  ["bits", "Bits", BITS],
  ["math", "Matemática", MATH],
  ["random", "Aleatório e tempo", RANDOM],
  ["extras", "Extras", EXTRAS],
];

/** The sections of the C++ reference, in reading order. */
export const CPP_SECTIONS: readonly Section[] = TABLE.map(([id, title]) => ({
  id,
  lang: "cpp",
  title,
}));

/**
 * Every C++ entry, grouped by section, with its recorded output. The oracle records
 * one output per entry, and `model.test.ts` fails when one is missing.
 */
export const CPP_ENTRIES: readonly Entry[] = TABLE.flatMap(([section, , drafts]) =>
  drafts.map((draft) => ({
    ...draft,
    lang: "cpp" as const,
    section,
    output: CPP_OUTPUTS[draft.id] as string,
  })),
);
