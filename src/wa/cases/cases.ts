import { BOUNDS_CASES } from "./bounds";
import type { WaCaseDef } from "./index";
import { NUMERIC_CASES } from "./numeric";
import { PERF_STL_CASES } from "./perf-stl";
import { STATE_CASES } from "./state";

/** All 32 hand-written competitive-programming WA hunt cases (4 per class). */
export const WA_CASE_DEFS: readonly WaCaseDef[] = [
  ...NUMERIC_CASES,
  ...BOUNDS_CASES,
  ...STATE_CASES,
  ...PERF_STL_CASES,
];
