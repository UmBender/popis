import { describe, expect, it } from "vitest";
import { CPP_OUTPUTS } from "./cpp/outputs";
import { entriesOf, LANG_LABEL, LANGS, sectionsOf } from "./langs";

// T46 AC-1: one model for every language; ids, sections and outputs hold together.

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
    for (const entry of entriesOf("cpp")) {
      expect(Object.hasOwn(CPP_OUTPUTS, entry.id), entry.id).toBe(true);
      expect(entry.output, entry.id).toBe(CPP_OUTPUTS[entry.id]);
      expect(entry.output.length, entry.id).toBeGreaterThan(0);
    }
  });

  it("every recorded output belongs to an entry", () => {
    const ids = new Set(entriesOf("cpp").map((e) => e.id));
    for (const id of Object.keys(CPP_OUTPUTS)) expect(ids.has(id), id).toBe(true);
  });

  it("entriesOf and sectionsOf return the language content", () => {
    expect(LANGS).toEqual(["cpp"]);
    expect(LANG_LABEL.cpp).toBe("C++");
    const sections = sectionsOf("cpp");
    expect(sections.map((s) => s.id)).toEqual([
      "io",
      "types",
      "containers",
      "algorithms",
      "strings",
      "bits",
      "math",
      "random",
      "extras",
    ]);
    // Entries come grouped by section, in section order.
    const order = entriesOf("cpp").map((e) => sections.findIndex((s) => s.id === e.section));
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });
});
