import { describe, expect, it } from "vitest";
import { CORPUS, LANGUAGES, pickSnippet, type Language } from "./corpus";

const PREFIX: Readonly<Record<Language, string>> = { cpp: "cpp-", python: "py-" };

describe("corpus", () => {
  it("corpus has at least 12 snippets per language", () => {
    for (const language of LANGUAGES) {
      expect(CORPUS.filter((s) => s.language === language).length).toBeGreaterThanOrEqual(12);
    }
  });

  it("corpus ids are unique and prefixed by the language", () => {
    expect(new Set(CORPUS.map((s) => s.id)).size).toBe(CORPUS.length);
    for (const s of CORPUS) expect(s.id.startsWith(PREFIX[s.language]), s.id).toBe(true);
  });

  it.each(CORPUS.map((s) => [s.id, s] as const))("corpus snippet %s follows the rules", (_, s) => {
    const lines = s.text.split("\n");
    expect(lines.length).toBeGreaterThanOrEqual(3);
    expect(lines.length).toBeLessThanOrEqual(12);
    expect(lines[0]).toMatch(/^\S/);
    for (const line of lines) {
      expect(line, JSON.stringify(line)).toMatch(/^[\x20-\x7e]+$/);
      expect(line.length, line).toBeLessThanOrEqual(60);
      expect(line, JSON.stringify(line)).not.toMatch(/\s$/);
      const indent = /^ */.exec(line)?.[0].length ?? 0;
      expect(indent % 4, line).toBe(0);
    }
  });
});

describe("pickSnippet", () => {
  it("pickSnippet only picks snippets of the checked languages", () => {
    for (let seed = 0; seed < 200; seed++) {
      expect(pickSnippet(seed, ["cpp"]).language).toBe("cpp");
      expect(pickSnippet(seed, ["python"]).language).toBe("python");
    }
  });

  it("pickSnippet reaches every snippet with both languages", () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 2000; seed++) seen.add(pickSnippet(seed, LANGUAGES).id);
    expect(seen.size).toBe(CORPUS.length);
  });

  it("pickSnippet without a language throws", () => {
    expect(() => pickSnippet(1, [])).toThrow(RangeError);
  });
});
