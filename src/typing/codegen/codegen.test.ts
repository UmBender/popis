import { describe, expect, it } from "vitest";
import { LANGUAGES } from "../corpus";
import {
  CPP_RULE_NAMES,
  DEFAULT_PROFILE,
  generateCode,
  generateCodeSnippet,
  PYTHON_RULE_NAMES,
  type CodegenProfile,
} from "./index";

describe("codegen grammar", () => {
  it("every C++ rule appears in a fixed seed sample", () => {
    expect(CPP_RULE_NAMES).toHaveLength(10);
    const seen = new Set<string>();
    for (let seed = 0; seed < 400; seed++) {
      const snippet = generateCode(seed, "cpp");
      expect(snippet.id).toBe(`gen:cpp:${String(seed)}`);
      expect(snippet.language).toBe("cpp");
      expect(snippet.seed).toBe(seed);
      seen.add(snippet.rule);
    }
    for (const rule of CPP_RULE_NAMES) {
      expect(seen.has(rule), `missing C++ rule ${rule}`).toBe(true);
    }
  });

  it("every Python rule appears in a fixed seed sample", () => {
    expect(PYTHON_RULE_NAMES).toHaveLength(7);
    const seen = new Set<string>();
    for (let seed = 0; seed < 400; seed++) {
      const snippet = generateCode(seed, "python");
      expect(snippet.id).toBe(`gen:python:${String(seed)}`);
      expect(snippet.language).toBe("python");
      expect(snippet.seed).toBe(seed);
      seen.add(snippet.rule);
    }
    for (const rule of PYTHON_RULE_NAMES) {
      expect(seen.has(rule), `missing Python rule ${rule}`).toBe(true);
    }
  });

  it("top 20 profile identifiers appear in a fixed seed sample", () => {
    const top20 = DEFAULT_PROFILE.identifiers.slice(0, 20).map((entry) => entry.value);
    expect(top20).toHaveLength(20);
    const tokens = new Set<string>();
    for (let seed = 0; seed < 400; seed++) {
      for (const lang of LANGUAGES) {
        const { text } = generateCode(seed, lang);
        for (const match of text.matchAll(/[A-Za-z_][A-Za-z0-9_]*/g)) {
          tokens.add(match[0]);
        }
      }
    }
    for (const ident of top20) {
      expect(tokens.has(ident), `missing top-20 identifier ${ident}`).toBe(true);
    }
  });

  it("profile constants and owner style appear in generated C++", () => {
    const corpus = Array.from({ length: 400 }, (_, seed) => generateCode(seed, "cpp").text).join(
      "\n",
    );
    for (const token of [
      "1e9 + 7",
      "998244353",
      "LLONG_MAX",
      "MAXN",
      "#define int ll",
      "vi",
      "pii",
    ]) {
      expect(corpus, `missing ${token}`).toContain(token);
    }
  });

  it("idiom weights from profile.json affect rule selection", () => {
    const cinHeavy: CodegenProfile = {
      ...DEFAULT_PROFILE,
      idioms: [{ value: "cin >> $0;", count: 100_000 }],
    };
    const sortHeavy: CodegenProfile = {
      ...DEFAULT_PROFILE,
      idioms: [{ value: "sort($0.begin(), $0.end());", count: 100_000 }],
    };
    let cinInCinHeavy = 0;
    let cinInSortHeavy = 0;
    let sortInCinHeavy = 0;
    let sortInSortHeavy = 0;
    for (let seed = 0; seed < 200; seed++) {
      const a = generateCode(seed, "cpp", cinHeavy).rule;
      const b = generateCode(seed, "cpp", sortHeavy).rule;
      if (a === "cin-read") cinInCinHeavy++;
      if (b === "cin-read") cinInSortHeavy++;
      if (a === "sort-lambda") sortInCinHeavy++;
      if (b === "sort-lambda") sortInSortHeavy++;
    }
    expect(cinInCinHeavy).toBeGreaterThan(cinInSortHeavy);
    expect(sortInSortHeavy).toBeGreaterThan(sortInCinHeavy);
  });

  it("generateCodeSnippet picks only from checked languages and throws when empty", () => {
    const seenBoth = new Set<string>();
    for (let seed = 0; seed < 100; seed++) {
      const cpp = generateCodeSnippet(seed, ["cpp"]);
      expect(cpp).toEqual(generateCode(seed, "cpp"));
      const py = generateCodeSnippet(seed, ["python"]);
      expect(py).toEqual(generateCode(seed, "python"));
      const both = generateCodeSnippet(seed, LANGUAGES);
      expect(both).toEqual(generateCode(seed, both.language));
      seenBoth.add(both.language);
    }
    expect(seenBoth).toEqual(new Set(LANGUAGES));
    expect(() => generateCodeSnippet(1, [])).toThrow(RangeError);
  });
});
