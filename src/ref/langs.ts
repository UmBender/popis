import { CPP_ENTRIES, CPP_SECTIONS } from "./cpp";
import type { Entry, Lang, Section } from "./model";

/** Every language of the reference, in tree order. */
export const LANGS: readonly Lang[] = ["cpp"];

export const LANG_LABEL: Readonly<Record<Lang, string>> = { cpp: "C++" };

const CONTENT: Readonly<Record<Lang, { sections: readonly Section[]; entries: readonly Entry[] }>> =
  { cpp: { sections: CPP_SECTIONS, entries: CPP_ENTRIES } };

export function isLang(value: string): value is Lang {
  return (LANGS as readonly string[]).includes(value);
}

export function sectionsOf(lang: Lang): readonly Section[] {
  return CONTENT[lang].sections;
}

/** The entries of a language, grouped by section in section order. */
export function entriesOf(lang: Lang): readonly Entry[] {
  return CONTENT[lang].entries;
}
