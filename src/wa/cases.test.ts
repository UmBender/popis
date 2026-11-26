import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { WA_CASES, WA_JUDGE_FLAGS, casesForClasses } from "./cases";
import { WA_CLASSES, WA_CLASS_LABELS, isWaClass, waClassLabel } from "./classes";
import { changedHunks } from "./diff";

// T41 AC-1: at least 32 cases (4 per class), localized fix diff around the bug line,
// valid lines, recorded oracle outputs and brute-force files.

function sentenceCount(text: string): number {
  const trimmed = text.trim();
  if (trimmed.length === 0) return 0;
  const matches = trimmed.match(/[.!?](?:\s|$)/g);
  return matches === null ? 1 : matches.length;
}

describe("wa cases (AC-1)", () => {
  it("every class has at least 4 cases", () => {
    expect(WA_CLASSES).toHaveLength(8);
    for (const bugClass of WA_CLASSES) {
      expect(isWaClass(bugClass)).toBe(true);
      expect(WA_CLASS_LABELS[bugClass].trim().length, bugClass).toBeGreaterThan(0);
      expect(waClassLabel(bugClass)).toBe(WA_CLASS_LABELS[bugClass]);
      const inClass = WA_CASES.filter((c) => c.class === bugClass);
      expect(inClass.length, bugClass).toBeGreaterThanOrEqual(4);
    }
    expect(isWaClass("inexistente")).toBe(false);
    expect(isWaClass(42)).toBe(false);
  });

  it("fixed differs from code only around the bug line", () => {
    expect(WA_CASES.length).toBeGreaterThanOrEqual(32);
    for (const c of WA_CASES) {
      expect(c.fixed, c.id).not.toBe(c.code);
      const hunks = changedHunks(c.code, c.fixed);
      expect(hunks, `${c.id} single diff hunk`).toHaveLength(1);
      const hunk = hunks[0]!;
      expect(hunk.oldStart, `${c.id} hunk start near line ${String(c.line)}`).toBeLessThanOrEqual(
        c.line + 1,
      );
      expect(hunk.oldEnd, `${c.id} hunk end near line ${String(c.line)}`).toBeGreaterThanOrEqual(
        c.line - 1,
      );
      expect(hunk.removedCount, `${c.id} removed lines`).toBeLessThanOrEqual(3);
      expect(hunk.addedCount, `${c.id} added lines`).toBeLessThanOrEqual(4);
    }
  });

  it("there are at least 32 cases with unique ids, valid lines, recorded outputs and brute files", () => {
    expect(WA_JUDGE_FLAGS).toEqual(["-std=c++20", "-O2"]);
    expect(WA_CASES.length).toBeGreaterThanOrEqual(32);
    const ids = new Set(WA_CASES.map((c) => c.id));
    expect(ids.size).toBe(WA_CASES.length);

    for (const c of WA_CASES) {
      const lines = c.code.split("\n");
      expect(c.line, c.id).toBeGreaterThanOrEqual(1);
      expect(c.line, c.id).toBeLessThanOrEqual(lines.length);
      expect((lines[c.line - 1] ?? "").trim().length, `${c.id} bug line non-empty`).toBeGreaterThan(
        0,
      );

      expect(c.title.trim().length, `${c.id} title`).toBeGreaterThan(0);
      expect(c.statement.trim().length, `${c.id} statement`).toBeGreaterThan(0);
      expect(c.sample_input.length, `${c.id} sample_input`).toBeGreaterThan(0);
      expect(c.breaking_input.length, `${c.id} breaking_input`).toBeGreaterThan(0);
      expect(c.explanation.trim().length, `${c.id} explanation`).toBeGreaterThan(0);
      expect(sentenceCount(c.explanation), `${c.id} explanation sentences`).toBeLessThanOrEqual(3);

      expect(c.sample_output.length, `${c.id} sample_output`).toBeGreaterThan(0);
      expect(c.wrong_output.length, `${c.id} wrong_output`).toBeGreaterThan(0);
      expect(c.expected_output.length, `${c.id} expected_output`).toBeGreaterThan(0);
      expect(c.verdict, `${c.id} verdict`).toBe(c.expected_verdict);
      if (c.verdict === "WA") {
        expect(c.wrong_output, `${c.id} wrong != expected`).not.toBe(c.expected_output);
      }

      const brutePath = join("src", "wa", "cases", "brute", `${c.id}.cpp`);
      expect(existsSync(brutePath), `${c.id} brute file exists`).toBe(true);
      expect(
        readFileSync(brutePath, "utf8").trim().length,
        `${c.id} brute non-empty`,
      ).toBeGreaterThan(0);
    }

    expect(casesForClasses(["overflow"])).toEqual(WA_CASES.filter((c) => c.class === "overflow"));
    expect(casesForClasses([])).toEqual(WA_CASES);
  });
});
