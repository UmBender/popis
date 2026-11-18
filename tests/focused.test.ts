import { describe, expect, it } from "vitest";
import { offending, sourceFiles } from "./source-files";

// A focused or skipped test silently hides others; none may be committed.
const FOCUSED = /\b(?:it|test|describe)\s*\.\s*(?:only|skip|todo)\b|\b(?:fit|xit|xdescribe)\(/;

describe("focused or skipped tests", () => {
  it("no test file uses only, skip or todo", () => {
    const files = [
      ...sourceFiles("src", (p) => /\.test\.tsx?$/.test(p)),
      ...sourceFiles("tests", (p) => /\.(test|spec)\.ts$/.test(p)),
    ];
    expect(files.length).toBeGreaterThan(0);
    expect(files.flatMap((p) => offending(p, FOCUSED))).toEqual([]);
  });
});
