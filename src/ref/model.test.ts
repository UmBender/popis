import { describe, expect, it } from "vitest";
import { CPP_OUTPUTS } from "./cpp/outputs";
import { entriesOf, LANG_DOCS, LANG_LABEL, LANG_TARGET, LANGS, sectionsOf } from "./langs";
import type { Lang } from "./model";
import { PY_OUTPUTS } from "./py/outputs";

// T46 AC-1 / T47 AC-1: one model for every language; ids, sections and outputs hold together.

const OUTPUTS: Readonly<Record<Lang, Readonly<Record<string, string>>>> = {
  cpp: CPP_OUTPUTS,
  py: PY_OUTPUTS,
};

describe("reference model", () => {
  it("entry ids are unique within a language", () => {
    for (const lang of LANGS) {
      const ids = entriesOf(lang).map((e) => e.id);
      expect(new Set(ids).size, lang).toBe(ids.length);
    }
  });

  it("every entry section exists", () => {
    for (const lang of LANGS) {
      const sections = new Set(sectionsOf(lang).map((s) => s.id));
      for (const entry of entriesOf(lang)) {
        expect(sections.has(entry.section), entry.id).toBe(true);
        expect(entry.lang).toBe(lang);
      }
    }
  });

  it("every example has a recorded output", () => {
    for (const lang of LANGS) {
      const map = OUTPUTS[lang];
      for (const entry of entriesOf(lang)) {
        expect(Object.hasOwn(map, entry.id), `${lang}/${entry.id}`).toBe(true);
        expect(entry.output, `${lang}/${entry.id}`).toBe(map[entry.id]);
        expect(entry.output.length, `${lang}/${entry.id}`).toBeGreaterThan(0);
      }
    }
  });

  it("every recorded output belongs to an entry", () => {
    for (const lang of LANGS) {
      const ids = new Set(entriesOf(lang).map((e) => e.id));
      for (const id of Object.keys(OUTPUTS[lang])) expect(ids.has(id), `${lang}/${id}`).toBe(true);
    }
  });

  it("entriesOf and sectionsOf return the language content", () => {
    expect(LANGS).toEqual(["cpp", "py"]);
    expect(LANG_LABEL).toEqual({ cpp: "C++", py: "Python" });
    expect(LANG_TARGET.cpp).toContain("gnu++20");
    expect(LANG_TARGET.py).toContain("3.9");
    expect(LANG_DOCS).toEqual({ cpp: "cppreference", py: "docs.python.org" });

    const expected: Readonly<Record<Lang, readonly string[]>> = {
      cpp: [
        "io",
        "types",
        "containers",
        "algorithms",
        "strings",
        "bits",
        "math",
        "random",
        "pb_ds",
        "gnu",
        "extras",
      ],
      py: [
        "io",
        "perf",
        "recursion",
        "structures",
        "sorting",
        "iter_func",
        "numbers",
        "strings",
        "pitfalls",
      ],
    };

    for (const lang of LANGS) {
      const sections = sectionsOf(lang);
      expect(
        sections.map((s) => s.id),
        lang,
      ).toEqual(expected[lang]);
      // Entries come grouped by section, in section order.
      const order = entriesOf(lang).map((e) => sections.findIndex((s) => s.id === e.section));
      expect(order, lang).toEqual([...order].sort((a, b) => a - b));
    }
  });
});
