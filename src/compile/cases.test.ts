import { describe, expect, it } from "vitest";
import { COMPILE_CASES, casesForGroups } from "./cases";
import { COMPILE_CAUSES, COMPILE_GROUPS, causeById, causesForGroup, isCauseId } from "./causes";

// T40 AC-1: at least 30 cases across all 6 groups (>= 4 per group), valid lines,
// causes from the cause list, non-empty recorded outputs and <= 2 sentence explanations.

function sentenceCount(text: string): number {
  const trimmed = text.trim();
  if (trimmed.length === 0) return 0;
  const matches = trimmed.match(/[.!?](?:\s|$)/g);
  return matches === null ? 1 : matches.length;
}

describe("compile cases (AC-1)", () => {
  it("every case line exists in its code", () => {
    expect(COMPILE_CASES.length).toBeGreaterThanOrEqual(30);
    for (const c of COMPILE_CASES) {
      const lines = c.code.split("\n");
      expect(c.line, c.id).toBeGreaterThanOrEqual(1);
      expect(c.line, c.id).toBeLessThanOrEqual(lines.length);
      expect((lines[c.line - 1] ?? "").trim().length, `${c.id} line ${String(c.line)}`).toBeGreaterThan(0);
    }
  });

  it("every cause belongs to the cause list and matches the case group", () => {
    expect(COMPILE_CAUSES.length).toBeGreaterThanOrEqual(COMPILE_GROUPS.length * 4);
    for (const group of COMPILE_GROUPS) {
      expect(causesForGroup(group).length, group).toBeGreaterThanOrEqual(4);
    }
    for (const c of COMPILE_CASES) {
      expect(isCauseId(c.cause), `${c.id} cause ${c.cause}`).toBe(true);
      expect(causeById(c.cause).group, c.id).toBe(c.group);
      expect(causeById(c.cause).label.trim().length, c.cause).toBeGreaterThan(0);
    }
  });

  it("every group has at least 4 cases", () => {
    for (const group of COMPILE_GROUPS) {
      const inGroup = COMPILE_CASES.filter((c) => c.group === group);
      expect(inGroup.length, group).toBeGreaterThanOrEqual(4);
    }
  });

  it("there are at least 30 cases with unique ids, non-empty flags, outputs and short explanations", () => {
    const ids = new Set(COMPILE_CASES.map((c) => c.id));
    expect(COMPILE_CASES.length).toBeGreaterThanOrEqual(30);
    expect(ids.size).toBe(COMPILE_CASES.length);
    for (const c of COMPILE_CASES) {
      expect(c.flags.length, c.id).toBeGreaterThan(0);
      expect(c.output.trim().length, `${c.id} output`).toBeGreaterThan(0);
      expect(c.explanation.trim().length, `${c.id} explanation`).toBeGreaterThan(0);
      expect(sentenceCount(c.explanation), `${c.id} sentences`).toBeLessThanOrEqual(2);
    }
    expect(casesForGroups(["asan"])).toEqual(COMPILE_CASES.filter((c) => c.group === "asan"));
    expect(casesForGroups([])).toEqual(COMPILE_CASES);
  });
});
