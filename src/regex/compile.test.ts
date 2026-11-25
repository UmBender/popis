import { describe, expect, it } from "vitest";
import { applyReplace, compile, validateReplacement } from "./compile";

// T45 AC-1: pure-TS regex engine with python and ere dialects, POSIX translation,
// search/fullmatch modes and readable dialect-specific errors.

describe("compile", () => {
  it("accepts and rejects syntax features according to dialect", () => {
    const cases: readonly {
      readonly pattern: string;
      readonly python: boolean;
      readonly ere: boolean;
      readonly errorHint?: RegExp;
    }[] = [
      { pattern: "abc", python: true, ere: true },
      { pattern: "a\\.b", python: true, ere: true },
      { pattern: "^[+-]?[0-9]+$", python: true, ere: true },
      { pattern: "(WA|TLE|RTE)", python: true, ere: true },
      { pattern: "[0-9]{2,4}", python: true, ere: true },
      { pattern: "[]a]", python: true, ere: true },
      { pattern: "\\d+", python: true, ere: false, errorHint: /\\d.*grep -E.*\[0-9\]/ },
      { pattern: "\\w+", python: true, ere: false, errorHint: /\\w.*grep -E/ },
      { pattern: "\\s+", python: true, ere: false, errorHint: /\\s.*grep -E/ },
      { pattern: "\\bcat\\b", python: true, ere: false, errorHint: /\\b.*grep -E/ },
      { pattern: "(?:ab)+", python: true, ere: false, errorHint: /\(\?:.*grep -E/ },
      { pattern: "a+?b", python: true, ere: false, errorHint: /preguiçoso.*grep -E/ },
      { pattern: "foo(?=\\d)", python: true, ere: false, errorHint: /Lookahead.*grep -E/ },
      { pattern: "foo(?!bar)", python: true, ere: false, errorHint: /Lookahead.*grep -E/ },
      { pattern: "[[:digit:]]+", python: false, ere: true, errorHint: /POSIX.*Python/ },
      { pattern: "[[:alpha:]]+", python: false, ere: true, errorHint: /POSIX.*Python/ },
      { pattern: "[[:space:]]+", python: false, ere: true, errorHint: /POSIX.*Python/ },
      { pattern: "(?<=a)b", python: false, ere: false, errorHint: /Lookbehind/ },
      { pattern: "(?<!a)b", python: false, ere: false, errorHint: /Lookbehind/ },
      { pattern: "(a)\\1", python: false, ere: false, errorHint: /Retro-referência/ },
      { pattern: "(?i)abc", python: false, ere: false, errorHint: /Flags inline/ },
      { pattern: "(?P<n>\\d+)", python: false, ere: false, errorHint: /nomeados/ },
      { pattern: "\\u0041", python: false, ere: false, errorHint: /Unicode/ },
    ];

    for (const c of cases) {
      const py = compile(c.pattern, "python");
      expect(py.ok, `python: ${c.pattern}`).toBe(c.python);
      if (!py.ok && !c.python && c.errorHint !== undefined && c.ere) {
        expect(py.error).toMatch(c.errorHint);
      }

      const ere = compile(c.pattern, "ere");
      expect(ere.ok, `ere: ${c.pattern}`).toBe(c.ere);
      if (!ere.ok && !c.ere && c.errorHint !== undefined && c.python) {
        expect(ere.error).toMatch(c.errorHint);
      }

      if (!c.python && !c.ere && c.errorHint !== undefined) {
        expect(py.ok ? "" : py.error).toMatch(c.errorHint);
        expect(ere.ok ? "" : ere.error).toMatch(c.errorHint);
      }
    }
  });

  it("translates POSIX classes in ere to matching JS character classes", () => {
    const alpha = compile("^[[:alpha:]]+$", "ere");
    expect(alpha.ok).toBe(true);
    if (alpha.ok) {
      expect(alpha.matcher.test("abcXYZ")).toBe(true);
      expect(alpha.matcher.test("abc1")).toBe(false);
    }

    const space = compile("^[[:space:]]+$", "ere");
    expect(space.ok).toBe(true);
    if (space.ok) {
      expect(space.matcher.test(" \t")).toBe(true);
      expect(space.matcher.test(" a ")).toBe(false);
    }

    const alnum = compile("^[[:alnum:]_]+$", "ere");
    expect(alnum.ok).toBe(true);
    if (alnum.ok) {
      expect(alnum.matcher.test("var_42")).toBe(true);
      expect(alnum.matcher.test("var-42")).toBe(false);
    }

    const xdigit = compile("^[[:xdigit:]]+$", "ere");
    expect(xdigit.ok).toBe(true);
    if (xdigit.ok) {
      expect(xdigit.matcher.test("dead09AF")).toBe(true);
      expect(xdigit.matcher.test("deadGG")).toBe(false);
    }

    const lowerUpper = compile("^[[:upper:]][[:lower:]]+$", "ere");
    expect(lowerUpper.ok).toBe(true);
    if (lowerUpper.ok) {
      expect(lowerUpper.matcher.test("Caso")).toBe(true);
      expect(lowerUpper.matcher.test("caso")).toBe(false);
    }
  });

  it("handles leading ] inside character classes and {,m} quantifiers like Python and ERE", () => {
    for (const dialect of ["python", "ere"] as const) {
      const bracket = compile("^[]a]+$", dialect);
      expect(bracket.ok).toBe(true);
      if (bracket.ok) {
        expect(bracket.matcher.test("]a]")).toBe(true);
        expect(bracket.matcher.test("b")).toBe(false);
      }

      const maxOnly = compile("^a{,2}$", dialect);
      expect(maxOnly.ok).toBe(true);
      if (maxOnly.ok) {
        expect(maxOnly.matcher.test("")).toBe(true);
        expect(maxOnly.matcher.test("aa")).toBe(true);
        expect(maxOnly.matcher.test("aaa")).toBe(false);
      }
    }
  });

  it("supports \\b word boundary only in python", () => {
    const py = compile("\\bcat\\b", "python");
    expect(py.ok).toBe(true);
    if (py.ok) {
      expect(py.matcher.test("the cat sat")).toBe(true);
      expect(py.matcher.test("scatter")).toBe(false);
    }

    const ere = compile("\\bcat\\b", "ere");
    expect(ere.ok).toBe(false);
    if (!ere.ok) {
      expect(ere.error).toMatch(/\\b/);
    }
  });

  it("distinguishes search and fullmatch modes", () => {
    const search = compile("\\d+", "python", "search");
    const full = compile("\\d+", "python", "fullmatch");
    expect(search.ok && full.ok).toBe(true);
    if (search.ok && full.ok) {
      expect(search.matcher.test("id=42")).toBe(true);
      expect(search.matcher.exec("id=42")).toEqual({
        start: 3,
        end: 5,
        text: "42",
        groups: [],
      });
      expect(full.matcher.test("id=42")).toBe(false);
      expect(full.matcher.test("42")).toBe(true);
    }
  });

  it("returns readable errors for malformed syntax and invalid quantifiers", () => {
    const bad = [
      "(abc",
      "abc)",
      "[abc",
      "abc\\",
      "*abc",
      "a++",
      "a{5,2}",
      "[:digit:]",
      "[[:bogus:]]",
    ];
    for (const p of bad) {
      const res = compile(p, "ere");
      expect(res.ok, p).toBe(false);
      if (!res.ok) expect(res.error.length).toBeGreaterThan(5);
    }
    const ereClassShortcut = compile("[\\d]+", "ere");
    expect(ereClassShortcut.ok).toBe(false);
    if (!ereClassShortcut.ok) expect(ereClassShortcut.error).toMatch(/\\d/);
  });

  it("extracts capture groups and finds all non-overlapping matches", () => {
    const res = compile("Case #(\\d+): (-?\\d+)", "python");
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.matcher.groupCount).toBe(2);
      expect(res.matcher.exec("Case #3: -17")).toEqual({
        start: 0,
        end: 12,
        text: "Case #3: -17",
        groups: ["3", "-17"],
      });
    }

    const all = compile("\\d+", "python");
    expect(all.ok).toBe(true);
    if (all.ok) {
      expect(all.matcher.findAll("a=12 b=345").map((s) => s.text)).toEqual(["12", "345"]);
    }
  });

  it("validates and applies dialect-aware replacements for re.sub and sed -E", () => {
    const py = compile("(\\d{4})-(\\d{2})-(\\d{2})", "python");
    expect(py.ok).toBe(true);
    if (py.ok) {
      expect(applyReplace(py.matcher, "data: 2026-11-25", "\\3/\\2/\\1")).toEqual({
        ok: true,
        output: "data: 25/11/2026",
      });
      expect(applyReplace(py.matcher, "data: 2026-11-25", "\\g<3>/\\g<2>/\\g<1>")).toEqual({
        ok: true,
        output: "data: 25/11/2026",
      });
      expect(applyReplace(py.matcher, "2026-11-25", "$1")).toEqual({
        ok: true,
        output: "$1",
      });
      expect(validateReplacement("\\4", "python", py.matcher.groupCount).ok).toBe(false);
    }

    const ere = compile("([0-9]+)=([a-z]+)", "ere");
    expect(ere.ok).toBe(true);
    if (ere.ok) {
      expect(applyReplace(ere.matcher, "10=ok 20=wa", "\\2:\\1")).toEqual({
        ok: true,
        output: "ok:10 wa:20",
      });
      expect(applyReplace(ere.matcher, "10=ok", "[&]")).toEqual({
        ok: true,
        output: "[10=ok]",
      });
      expect(validateReplacement("\\g<1>", "ere", ere.matcher.groupCount).ok).toBe(false);
    }
  });

  it("handles edge cases in classes, escapes, quantifiers, zero-width findAll and replacements", () => {
    // Character class edge cases.
    expect(compile("[a\\", "python").ok).toBe(false);
    expect(compile("[\\u0041]", "python").ok).toBe(false);
    expect(compile("[\\1]", "python").ok).toBe(false);
    expect(compile("[z-a]", "python").ok).toBe(false);
    const ereBackslash = compile("^[\\\\a]+$", "ere");
    expect(ereBackslash.ok).toBe(true);
    if (ereBackslash.ok) {
      expect(ereBackslash.matcher.test("\\a")).toBe(true);
    }

    // Unsupported (?...), bad braces, dangling {2}, \A/\Z, \t/\n/\r and unknown escapes.
    expect(compile("(?#note)a", "python").ok).toBe(false);
    expect(compile("a{abc}", "python").ok).toBe(false);
    expect(compile("{2}", "python").ok).toBe(false);
    expect(compile("\\Aabc\\Z", "python").ok).toBe(false);
    expect(compile("\\t\\n\\r", "python").ok).toBe(true);
    expect(compile("\\t", "ere").ok).toBe(false);
    expect(compile("\\a", "python").ok).toBe(false);

    // Zero-width match in findAll does not infinite-loop.
    const empty = compile("^", "python");
    expect(empty.ok).toBe(true);
    if (empty.ok) {
      expect(empty.matcher.findAll("ab").map((s) => [s.start, s.end])).toEqual([[0, 0]]);
      expect(empty.matcher.findAll("").map((s) => [s.start, s.end])).toEqual([[0, 0]]);
    }

    // Replacement escapes and error paths.
    const py = compile("(\\d+)", "python");
    expect(py.ok).toBe(true);
    if (py.ok) {
      expect(applyReplace(py.matcher, "7", "\\g<0>\\t\\n\\\\")).toEqual({
        ok: true,
        output: "7\t\n\\",
      });
      expect(applyReplace(py.matcher, "7", "\\")).toMatchObject({ ok: false });
      expect(applyReplace(py.matcher, "7", "\\g<bad>")).toMatchObject({ ok: false });
      expect(applyReplace(py.matcher, "7", "\\g<2>")).toMatchObject({ ok: false });
      expect(applyReplace(py.matcher, "7", "\\q")).toMatchObject({ ok: false });
    }

    const ere = compile("([0-9]+)", "ere");
    expect(ere.ok).toBe(true);
    if (ere.ok) {
      expect(applyReplace(ere.matcher, "7", "\\&\\\\")).toEqual({ ok: true, output: "&\\" });
    }
  });
});
