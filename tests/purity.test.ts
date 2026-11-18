import { describe, expect, it } from "vitest";
import { offending, sourceFiles } from "./source-files";

// Randomness and time come only from src/core/rng.ts and src/core/clock.ts,
// so every test can pin them (AGENTS.md, "Determinismo").
const ALLOWED = new Set(["src/core/rng.ts", "src/core/clock.ts"]);
const IMPURE = /Math\.random|Date\.now|performance\.now|new Date\(/;

describe("purity", () => {
  it("no randomness or time source outside rng.ts and clock.ts", () => {
    const files = sourceFiles("src", (p) => /\.tsx?$/.test(p)).filter((p) => !ALLOWED.has(p));
    expect(files.length).toBeGreaterThan(0);
    expect(files.flatMap((p) => offending(p, IMPURE))).toEqual([]);
  });

  it("the allowed files exist", () => {
    const files = sourceFiles("src/core", () => true);
    for (const path of ALLOWED) expect(files).toContain(path);
  });
});
