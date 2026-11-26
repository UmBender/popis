import { defineConfig, devices } from "@playwright/test";

const port = 4173;
// ADR-T11-1: the phone project runs against the Pages build under /popis/.
const pagesPort = 4174;
const pagesBase = "/popis/";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: true,
  reporter: "list",
  use: { trace: "retain-on-failure" },
  projects: [
    {
      name: "chromium",
      testIgnore: "mobile.spec.ts",
      use: { ...devices["Desktop Chrome"], baseURL: `http://localhost:${port}` },
    },
    {
      name: "mobile",
      testMatch: [
        "mobile.spec.ts",
        "gdb.spec.ts",
        "compile.spec.ts",
        "wa.spec.ts",
        "stl.spec.ts",
        "shell-drill.spec.ts",
        "regex.spec.ts",
        "ref.spec.ts",
      ],
      use: { ...devices["Pixel 7"], baseURL: `http://localhost:${pagesPort}${pagesBase}` },
    },
  ],
  webServer: [
    {
      command: `npm run build && npx vite preview --port ${port} --strictPort`,
      url: `http://localhost:${port}`,
      reuseExistingServer: false,
    },
    {
      command:
        `npx vite build --base=${pagesBase} --outDir dist-pages && ` +
        `npx vite preview --base=${pagesBase} --outDir dist-pages --port ${pagesPort} --strictPort`,
      url: `http://localhost:${pagesPort}${pagesBase}`,
      reuseExistingServer: false,
    },
  ],
});
