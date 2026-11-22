import { describe, expect, it } from "vitest";
import {
  FORMAT_CASES,
  buildFormatCaseState,
  type FormatCaseGroup,
} from "./cases/format-cases";
import { evalGdbCommand } from "./format";

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

  it("rejects malformed print or examine commands cleanly", () => {
    expect(evalGdbCommand("", state).ok).toBe(false);
    expect(evalGdbCommand("p/z neg", state).ok).toBe(false);
    expect(evalGdbCommand("x/0xb &pos", state).ok).toBe(false);
    expect(evalGdbCommand("unknown neg", state).ok).toBe(false);
  });
});
