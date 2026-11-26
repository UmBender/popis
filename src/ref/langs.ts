import { CPP_ENTRIES, CPP_SECTIONS } from "./cpp";
import type { Entry, Lang, Section } from "./model";
import { PY_ENTRIES, PY_SECTIONS } from "./py";

/** Every language of the reference, in tree order. */
export const LANGS: readonly Lang[] = ["cpp", "py"];

export const LANG_LABEL: Readonly<Record<Lang, string>> = { cpp: "C++", py: "Python" };

/** Judge target shown under the panel title (ADR-T47-1). */
export const LANG_TARGET: Readonly<Record<Lang, string>> = {
  cpp: "g++ -std=gnu++20 -O2 (WF 2026)",
  py: "PyPy3 7.3.15 / Python 3.9 (WF 2026)",
};

/** External documentation site label per language (ADR-T47-1). */
export const LANG_DOCS: Readonly<Record<Lang, string>> = {
  cpp: "cppreference",
  py: "docs.python.org",
};

const CONTENT: Readonly<Record<Lang, { sections: readonly Section[]; entries: readonly Entry[] }>> =
  {
    cpp: { sections: CPP_SECTIONS, entries: CPP_ENTRIES },
    py: { sections: PY_SECTIONS, entries: PY_ENTRIES },
  };

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
