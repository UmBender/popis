import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { read, ROOT } from "./source-files";

// ADR-T11-1: the app is built under /popis/ and deployed by a pinned
// Actions workflow only after `npm run check` passes.
const WORKFLOW = ".github/workflows/pages.yml";

function workflow(): string {
  expect(existsSync(join(ROOT, WORKFLOW)), `${WORKFLOW} exists`).toBe(true);
  return read(WORKFLOW);
}

/** The `run:` commands of the workflow, in order. */
function runs(text: string): string[] {
  return [...text.matchAll(/^\s*(?:-\s+)?run:\s*(.+)$/gm)].map((m) => (m[1] ?? "").trim());
}

describe("pages", () => {
  it("build:pages script uses the /popis/ base", () => {
    const scripts = (JSON.parse(read("package.json")) as { scripts: Record<string, string> })
      .scripts;
    expect(scripts["build:pages"]).toBe("vite build --base=/popis/");
    expect(scripts["build"]).toBe("vite build");
  });

  it("pages workflow runs on pushes to main and by hand", () => {
    const text = workflow();
    expect(text).toMatch(/^on:\n {2}push:\n {4}branches: \[main\]\n {2}workflow_dispatch:/m);
  });

  it("pages workflow installs, checks, fetches contests and builds in that order", () => {
    // ADR-T38-1 amends ADR-T11-1 by fetching contests.json before build:pages.
    expect(runs(workflow())).toEqual([
      "npm ci",
      "npm run check",
      "npm run contests:fetch",
      "npm run build:pages",
    ]);
  });

  it("pages workflow uploads dist and deploys it", () => {
    const text = workflow();
    expect(text).toMatch(/uses: actions\/upload-pages-artifact@\w+.*\n\s+with:\n\s+path: dist\n/);
    expect(text).toMatch(/uses: actions\/deploy-pages@/);
    expect(text).toMatch(/^ {2}pages: write$/m);
    expect(text).toMatch(/^ {2}id-token: write$/m);
  });

  it("pages workflow pins every action to a commit sha", () => {
    const uses = [...workflow().matchAll(/uses:\s*(\S+)/g)].map((m) => m[1] ?? "");
    expect(uses.length).toBeGreaterThan(0);
    for (const action of uses) expect(action).toMatch(/^[\w-]+\/[\w-]+@[0-9a-f]{40}$/);
  });
});
