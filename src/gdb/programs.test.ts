import { describe, expect, it } from "vitest";
import { PROGRAMS, programById } from "./programs";

// T25 AC-3: at least 12 short CP C++ programs (<= 40 lines), unique target line numbers.

describe("gdb programs (AC-3)", () => {
  it("contains at least 12 short competitive programming C++ programs", () => {
    expect(PROGRAMS.length).toBeGreaterThanOrEqual(12);
    const ids = new Set<string>();
    const tags = new Set<string>();

    for (const prog of PROGRAMS) {
      expect(ids.has(prog.id), `duplicate program id ${prog.id}`).toBe(false);
      ids.add(prog.id);
      expect(prog.lines.length, `${prog.id} too long`).toBeLessThanOrEqual(40);
      expect(prog.lines.length, `${prog.id} empty`).toBeGreaterThanOrEqual(10);
      expect(prog.file).toMatch(/\.cpp$/);
      expect(programById(prog.id)).toBe(prog);
      for (const tag of prog.tags) tags.add(tag);
    }

    // Must cover loops, prefix sum, binary search, recursive DFS, struct, linked list, segfault.
    for (const required of [
      "loop",
      "prefix-sum",
      "binary-search",
      "dfs",
      "struct",
      "linked-list",
      "segfault",
    ]) {
      expect(tags.has(required), `missing program category ${required}`).toBe(true);
    }

    expect(() => programById("does-not-exist")).toThrow();
  });

  it("every program has unique line numbers for its targets", () => {
    for (const prog of PROGRAMS) {
      const seen = new Set<number>();
      for (const target of prog.targets) {
        expect(
          seen.has(target.line),
          `${prog.id} duplicate target line ${String(target.line)}`,
        ).toBe(false);
        seen.add(target.line);
        expect(target.line, `${prog.id}:${target.id} line >= 1`).toBeGreaterThanOrEqual(1);
        expect(target.line, `${prog.id}:${target.id} line <= lines`).toBeLessThanOrEqual(
          prog.lines.length,
        );
        const sourceLine = prog.lines[target.line - 1] ?? "";
        expect(sourceLine, `${prog.id}:${target.id} matches snippet`).toContain(target.match);
      }

      for (const fn of prog.functions) {
        expect(fn.line).toBeGreaterThanOrEqual(1);
        expect(fn.line).toBeLessThanOrEqual(prog.lines.length);
        const sourceLine = prog.lines[fn.line - 1] ?? "";
        expect(sourceLine, `${prog.id} fn ${fn.name}`).toContain(fn.name);
      }
    }
  });
});
