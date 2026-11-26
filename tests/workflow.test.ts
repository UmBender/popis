import { describe, expect, it } from "vitest";
import { read } from "./source-files";

// T38 AC-5 / ADR-T38-1: Pages workflow refreshes contests.json every 6 h and
// runs `npm run contests:fetch` before `npm run build:pages`.
const WORKFLOW = ".github/workflows/pages.yml";

function runs(text: string): string[] {
  return [...text.matchAll(/^\s*(?:-\s+)?run:\s*(.+)$/gm)].map((m) => (m[1] ?? "").trim());
}

describe("contests workflow", () => {
  it("pages workflow triggers on push to main, workflow_dispatch and a 6-hour cron schedule", () => {
    const text = read(WORKFLOW);

    expect(text).toMatch(/^on:\n {2}push:\n {4}branches: \[main\]/m);
    expect(text).toMatch(/^ {2}workflow_dispatch:/m);
    expect(text).toMatch(/^ {2}schedule:\n {4}- cron: ["']0 \*\/6 \* \* \*["']$/m);
  });

  it("pages workflow runs contests:fetch after check and before build:pages", () => {
    const steps = runs(read(WORKFLOW));
    const checkIdx = steps.indexOf("npm run check");
    const fetchIdx = steps.indexOf("npm run contests:fetch");
    const buildIdx = steps.indexOf("npm run build:pages");

    expect(checkIdx).toBeGreaterThanOrEqual(0);
    expect(fetchIdx).toBeGreaterThan(checkIdx);
    expect(buildIdx).toBeGreaterThan(fetchIdx);
  });

  it("generated public/contests.json is ignored by git", () => {
    const ignore = read(".gitignore")
      .split("\n")
      .map((line) => line.trim());

    expect(ignore).toContain("public/contests.json");
  });
});
