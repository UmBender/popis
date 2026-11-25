import { describe, expect, it } from "vitest";
import { checkCasar, checkExtrair, checkLer, checkTrocar, editDistance } from "./check";
import type { CasarItem, ExtrairItem, LerItem, TrocarItem } from "./types";

// T45 AC-2: item checking for casar, extrair, trocar and ler, accepting equivalent
// regexes and rejecting near-misses (length-only, missing anchor, unescaped dot).

const DECIMAL_ITEM: CasarItem = {
  id: "test-decimal",
  kind: "casar",
  kc: "regex.casar",
  family: "decimal",
  dialect: "python",
  mode: "search",
  prompt: "Número decimal com sinal opcional (linha inteira).",
  positive: ["3.14", "-0.5", "12.05"],
  negative: ["3a14", "3.", ".5", "3.14x", "12"],
  canonical: "^[+-]?\\d+\\.\\d+$",
  canonicalByDialect: {
    python: "^[+-]?\\d+\\.\\d+$",
    ere: "^[+-]?[0-9]+\\.[0-9]+$",
  },
  explanation: "Âncoras exigem linha inteira e \\. exige ponto literal.",
};

describe("checkCasar", () => {
  it("accepts regexes different from the canonical when they separate both lists", () => {
    const alt1 = checkCasar("^-?[0-9]+\\.[0-9]+$", DECIMAL_ITEM);
    expect(alt1.ok && alt1.allPassed).toBe(true);

    const alt2 = checkCasar("^[+-]?\\d+\\.\\d{1,2}$", DECIMAL_ITEM);
    expect(alt2.ok && alt2.allPassed).toBe(true);
  });

  it("rejects near-misses: matching only by length, missing anchor and unescaped dot", () => {
    // Length-only pattern matches same-length negative "3a14".
    const byLength = checkCasar("^.{4,5}$", DECIMAL_ITEM);
    expect(byLength.ok).toBe(true);
    if (byLength.ok) {
      expect(byLength.allPassed).toBe(false);
      expect(byLength.lines.find((l) => l.line === "3a14")?.ok).toBe(false);
    }

    // Missing end anchor matches "3.14x".
    const noAnchor = checkCasar("[+-]?\\d+\\.\\d+", DECIMAL_ITEM);
    expect(noAnchor.ok).toBe(true);
    if (noAnchor.ok) {
      expect(noAnchor.allPassed).toBe(false);
      expect(noAnchor.lines.find((l) => l.line === "3.14x")?.ok).toBe(false);
    }

    // Unescaped dot matches "3a14".
    const rawDot = checkCasar("^[+-]?\\d+.\\d+$", DECIMAL_ITEM);
    expect(rawDot.ok).toBe(true);
    if (rawDot.ok) {
      expect(rawDot.allPassed).toBe(false);
      expect(rawDot.lines.find((l) => l.line === "3a14")?.ok).toBe(false);
    }
  });

  it("returns compile errors without throwing on invalid patterns", () => {
    const res = checkCasar("[0-9", DECIMAL_ITEM);
    expect(res.ok).toBe(false);
  });
});

describe("checkExtrair", () => {
  const item: ExtrairItem = {
    id: "test-extrair",
    kind: "extrair",
    kc: "regex.extrair",
    family: "case-answer",
    dialect: "python",
    mode: "search",
    prompt: "Extraia a resposta após 'Case #N: ' no grupo 1.",
    cases: [
      { line: "Case #3: 17", expected: "17" },
      { line: "Case #12: -40", expected: "-40" },
      { line: "Case #9: 0", expected: "0" },
      { line: "Case 9: 17", expected: null },
    ],
    canonical: "Case #\\d+: (-?\\d+)",
    canonicalByDialect: {
      python: "Case #\\d+: (-?\\d+)",
      ere: "Case #[0-9]+: (-?[0-9]+)",
    },
    explanation: "Os parênteses capturam o número no grupo 1.",
  };

  it("accepts equivalent regexes that capture the expected group 1", () => {
    const res = checkExtrair("Case #[0-9]+: ([+-]?[0-9]+)", item);
    expect(res.ok && res.allPassed).toBe(true);
  });

  it("rejects patterns without a capturing group or matching control lines", () => {
    const noGroup = checkExtrair("Case #\\d+: -?\\d+", item);
    expect(noGroup.ok).toBe(false);

    const loose = checkExtrair(": (-?\\d+)", item);
    expect(loose.ok).toBe(true);
    if (loose.ok) {
      expect(loose.allPassed).toBe(false);
      expect(loose.cases[3]?.ok).toBe(false);
    }
  });
});

describe("checkTrocar", () => {
  const pyItem: TrocarItem = {
    id: "test-trocar-py",
    kind: "trocar",
    kc: "regex.trocar",
    family: "date-br",
    dialect: "python",
    mode: "search",
    prompt: "Troque datas AAAA-MM-DD para DD/MM/AAAA.",
    cases: [
      { before: "2026-11-25", after: "25/11/2026" },
      { before: "data=2025-03-09 ok", after: "data=09/03/2025 ok" },
      { before: "2026/11/25", after: "2026/11/25" },
    ],
    canonical: "(\\d{4})-(\\d{2})-(\\d{2})",
    canonicalReplacement: "\\3/\\2/\\1",
    canonicalByDialect: {
      python: { pattern: "(\\d{4})-(\\d{2})-(\\d{2})", replacement: "\\3/\\2/\\1" },
      ere: { pattern: "([0-9]{4})-([0-9]{2})-([0-9]{2})", replacement: "\\3/\\2/\\1" },
    },
    explanation: "Cada grupo captura uma parte da data.",
  };

  it("accepts both \\1 and \\g<1> in python and rejects \\g<1> in ere", () => {
    expect(checkTrocar("(\\d{4})-(\\d{2})-(\\d{2})", "\\3/\\2/\\1", pyItem)).toMatchObject({
      ok: true,
      allPassed: true,
    });
    expect(
      checkTrocar("(\\d{4})-(\\d{2})-(\\d{2})", "\\g<3>/\\g<2>/\\g<1>", pyItem),
    ).toMatchObject({
      ok: true,
      allPassed: true,
    });

    const ereItem: TrocarItem = { ...pyItem, dialect: "ere" };
    const badRepl = checkTrocar("([0-9]{4})-([0-9]{2})-([0-9]{2})", "\\g<3>/\\g<2>/\\g<1>", ereItem);
    expect(badRepl.ok).toBe(false);
    if (!badRepl.ok) expect(badRepl.field).toBe("replacement");
  });
});

describe("checkLer", () => {
  const item: LerItem = {
    id: "test-ler",
    kind: "ler",
    kc: "regex.ler",
    family: "dot",
    dialect: "python",
    mode: "search",
    prompt: "Marque as linhas em que a regex casa.",
    pattern: "a\\.b",
    lines: ["a.b", "axb", "xa.by", "ab", "a..b"],
    expected: [true, false, true, false, false],
    canonical: "linhas 1, 3",
    explanation: "\\. exige ponto literal.",
  };

  it("accepts exact boolean selection and reports mismatches per line", () => {
    expect(checkLer([true, false, true, false, false], item)).toMatchObject({
      ok: true,
      allPassed: true,
      passedCount: 5,
    });

    const wrong = checkLer([true, true, true, false, false], item);
    expect(wrong.allPassed).toBe(false);
    expect(wrong.passedCount).toBe(4);
    expect(wrong.lines[1]?.ok).toBe(false);
  });
});

describe("editDistance", () => {
  it("computes single-character insertion, deletion and substitution as distance 1", () => {
    expect(editDistance("3.14", "3.14")).toBe(0);
    expect(editDistance("3.14", "3a14")).toBe(1);
    expect(editDistance("3.14", "3.14x")).toBe(1);
    expect(editDistance("3.14", "3.1")).toBe(1);
    expect(editDistance("abc", "xyz")).toBe(3);
  });
});
