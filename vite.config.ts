import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    include: ["src/**/*.test.{ts,tsx}", "tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    // Room for a slow, busy machine: limits are not what the tests check (ADR-T37-1).
    testTimeout: 20_000,
    // `.only` fails the run instead of silently skipping the rest.
    allowOnly: false,
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.{ts,tsx}", "src/main.tsx"],
      reporter: ["text-summary", "text"],
      // Ratchet: raise these when coverage rises, never lower them without an ADR.
      thresholds: {
        "src/core/**": { lines: 100, statements: 100, functions: 100, branches: 92 },
        "src/gdb/**": { lines: 99, statements: 99, functions: 100, branches: 96 },
        "src/gen/**": { lines: 100, statements: 100, functions: 100, branches: 100 },
        "src/learn/**": { lines: 100, statements: 100, functions: 100, branches: 100 },
        "src/math/**": { lines: 99, statements: 99, functions: 100, branches: 96 },
        "src/regex/**": { lines: 100, statements: 99, functions: 100, branches: 98 },
        "src/session/**": { lines: 100, statements: 100, functions: 100, branches: 100 },
        "src/stats/**": { lines: 100, statements: 100, functions: 100, branches: 100 },
        "src/storage/**": { lines: 100, statements: 100, functions: 100, branches: 100 },
        "src/ui/**": { lines: 100, statements: 100, functions: 100, branches: 97 },
        "src/typing/**": { lines: 100, statements: 100, functions: 100, branches: 100 },
        "src/vim/**": { lines: 100, statements: 100, functions: 100, branches: 100 },
        "src/modes.ts": { lines: 100, statements: 100, functions: 100, branches: 100 },
      },
    },
  },
});
