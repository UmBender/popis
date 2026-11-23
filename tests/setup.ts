import { cleanup } from "@testing-library/react";
import fc from "fast-check";
import { afterEach } from "vitest";

/** Seed of the property tests in `check` and `coverage` (ADR-T37-1). */
const CHECK_SEED = 20261122;

// Property tests run 200 cases with a fixed seed, so the same code always
// gives the same result and coverage. `npm run test:fuzz` sets FC_NUM_RUNS and
// draws a new seed each run; reproduce a failure with FC_SEED=<seed>.
const runs = process.env["FC_NUM_RUNS"];
const seedEnv = process.env["FC_SEED"];
const seed = seedEnv !== undefined ? Number(seedEnv) : runs === undefined ? CHECK_SEED : undefined;
fc.configureGlobal({ numRuns: Number(runs ?? 200), ...(seed === undefined ? {} : { seed }) });

afterEach(() => {
  cleanup();
});
