import { describe, expect, it } from "vitest";
import { FORMAT_CASES, buildFormatCaseState, type FormatCaseGroup } from "./cases/format-cases";
import { evalGdbCommand, formatCharLiteral, formatValue } from "./format";
import { evalExpr } from "./expr";

// T26 AC-3: gdb 18.1 formatting tables for print formats, char escapes, arrays,
// <repeats>, 200-element cap, char strings, structs, pointers, whatis/ptype and x/Nfu.

const GROUPS: readonly FormatCaseGroup[] = [
  "formato",
  "char",
  "array",
  "string",
  "struct",
  "ponteiro",
  "whatis",
  "memoria",
];

describe("gdb output formatter (AC-3)", () => {
  const state = buildFormatCaseState();

  for (const group of GROUPS) {
    it(`formats ${group} cases identically to GNU gdb 18.1`, () => {
      const cases = FORMAT_CASES.filter((c) => c.group === group);
      expect(cases.length).toBeGreaterThan(0);
      for (const c of cases) {
        const res = evalGdbCommand(c.command, state);
        expect(res.ok, `${c.id}: ${c.command}`).toBe(true);
        if (res.ok) {
          expect(res.output, `${c.id}: ${c.command}`).toBe(c.expected);
        }
      }
    });
  }

  it("rejects malformed print or examine commands cleanly and covers control escapes and octal examine", () => {
    expect(evalGdbCommand("", state).ok).toBe(false);
    expect(evalGdbCommand("p/z neg", state).ok).toBe(false);
    expect(evalGdbCommand("x/0xb &pos", state).ok).toBe(false);
    expect(evalGdbCommand("x/4zb &pos", state).ok).toBe(false);
    expect(evalGdbCommand("unknown neg", state).ok).toBe(false);
    expect(evalGdbCommand("p missingVar", state).ok).toBe(false);

    expect(formatCharLiteral(7, "'")).toBe("\\a");
    expect(formatCharLiteral(8, "'")).toBe("\\b");
    expect(formatCharLiteral(11, "'")).toBe("\\v");
    expect(formatCharLiteral(12, "'")).toBe("\\f");
    expect(formatCharLiteral(13, "'")).toBe("\\r");

    const oct = evalGdbCommand("x/4ob &pos", state);
    expect(oct).toEqual({ ok: true, kind: "examine", output: "02 01 0 0" });
    const nullHex = evalGdbCommand("p/x np", state);
    expect(nullHex).toEqual({ ok: true, kind: "print", output: "0x0" });
    const ptypeInt = evalGdbCommand("ptype int", state);
    expect(ptypeInt).toEqual({ ok: true, kind: "ptype", output: "type = int" });
    const truncChar = formatValue(evalExpr("str6", state), state, undefined, {
      elements: 2,
      repeats: 10,
    });
    expect(truncChar).toBe('"ab"...');
  });
});
