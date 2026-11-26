import { describe, expect, it } from "vitest";
import { changedHunks, diffCode, diffSnippet } from "./diff";

// T41 AC-1 & AC-4: pure line diff between buggy code and fixed code.

describe("wa diff (AC-1)", () => {
  it("diffCode and changedHunks locate single-line, multi-line, added and removed edits", () => {
    const base = ["int a = 1;", "int b = 2;", "int c = a + b;", "return c;"].join("\n");

    // Identical files produce no hunks and an empty snippet.
    expect(changedHunks(base, base)).toEqual([]);
    expect(diffCode(base, base).every((l) => l.kind === "context")).toBe(true);
    expect(diffSnippet(base, base, 1)).toEqual([]);

    // Single-line edit on line 3.
    const edited = ["int a = 1;", "int b = 2;", "long long c = 1LL * a + b;", "return c;"].join(
      "\n",
    );
    const hunks = changedHunks(base, edited);
    expect(hunks).toHaveLength(1);
    expect(hunks[0]?.oldStart).toBe(3);
    expect(hunks[0]?.oldEnd).toBe(3);
    expect(hunks[0]?.removedCount).toBe(1);
    expect(hunks[0]?.addedCount).toBe(1);

    const snippet = diffSnippet(base, edited, 1);
    expect(snippet.map((l) => l.kind)).toEqual(["context", "removed", "added", "context"]);
    expect(snippet[1]?.oldLine).toBe(3);
    expect(snippet[1]?.newLine).toBeNull();
    expect(snippet[2]?.oldLine).toBeNull();
    expect(snippet[2]?.newLine).toBe(3);

    // Pure insertion after line 1.
    const inserted = ["int a = 1;", "int extra = 0;", "int b = 2;", "int c = a + b;", "return c;"].join(
      "\n",
    );
    const insHunks = changedHunks(base, inserted);
    expect(insHunks).toHaveLength(1);
    expect(insHunks[0]?.removedCount).toBe(0);
    expect(insHunks[0]?.addedCount).toBe(1);
    expect(insHunks[0]?.oldStart).toBe(2);

    // Pure deletion of line 2.
    const deleted = ["int a = 1;", "int c = a + b;", "return c;"].join("\n");
    const delHunks = changedHunks(base, deleted);
    expect(delHunks).toHaveLength(1);
    expect(delHunks[0]?.oldStart).toBe(2);
    expect(delHunks[0]?.oldEnd).toBe(2);
    expect(delHunks[0]?.removedCount).toBe(1);
    expect(delHunks[0]?.addedCount).toBe(0);

    // Two distant edits yield two distinct hunks.
    const far = ["long long a = 1;", "int b = 2;", "int c = a + b;", "return c + 1;"].join("\n");
    expect(changedHunks(base, far)).toHaveLength(2);
  });
});
