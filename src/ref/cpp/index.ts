import type { Entry, EntryDraft, Section } from "../model";
import { CPP_OUTPUTS } from "./outputs";

/** The sections of the C++ reference, in reading order. */
export const CPP_SECTIONS: readonly Section[] = (
  [
    ["io", "Template e I/O"],
    ["types", "Tipos e limites"],
    ["containers", "Contêineres"],
    ["algorithms", "Algoritmos"],
    ["strings", "Strings"],
    ["bits", "Bits"],
    ["math", "Matemática"],
    ["random", "Aleatório e tempo"],
    ["extras", "Extras"],
  ] as const
).map(([id, title]) => ({ id, lang: "cpp", title }));

/** The drafts of each section, by section id. */
export const CPP_DRAFTS: Readonly<Record<string, readonly EntryDraft[]>> = {};

/** Every C++ entry, grouped by section, with its recorded output. */
export const CPP_ENTRIES: readonly Entry[] = CPP_SECTIONS.flatMap((section) =>
  (CPP_DRAFTS[section.id] ?? []).map((draft) => ({
    ...draft,
    lang: "cpp" as const,
    section: section.id,
    output: CPP_OUTPUTS[draft.id] ?? "",
  })),
);
