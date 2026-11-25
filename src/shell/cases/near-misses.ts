import type { CheckOptions } from "../check";

export type NearMissCase = {
  readonly id: string;
  readonly description: string;
  readonly canonical: string;
  readonly nearMiss: string;
  readonly options?: CheckOptions;
  readonly fixture: string;
  readonly probe?: string;
  readonly reasonMatch: RegExp;
};

export const NEAR_MISS_CASES: readonly NearMissCase[] = [];
