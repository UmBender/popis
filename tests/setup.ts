import { cleanup } from "@testing-library/react";
import fc from "fast-check";
import { afterEach } from "vitest";

// Property tests run 200 cases by default; `npm run test:fuzz` raises it.
fc.configureGlobal({ numRuns: Number(process.env["FC_NUM_RUNS"] ?? 200) });

afterEach(() => {
  cleanup();
});
