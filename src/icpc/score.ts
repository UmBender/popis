export const VERDICTS = ["AC", "WA", "TLE", "MLE", "RTE", "PE", "CE"] as const;
export type Verdict = (typeof VERDICTS)[number];

export type Submission = {
  readonly team: string;
  readonly problem: string;
  readonly minute: number;
  readonly verdict: Verdict;
};

export type ScoreOptions = {
  readonly compileErrorCounts?: boolean;
  readonly penaltyPerReject?: number;
  readonly teams?: readonly string[];
  readonly problems?: readonly string[];
};

export type ProblemCell = {
  readonly problem: string;
  readonly solved: boolean;
  readonly acMinute: number | null;
  readonly rejected: number;
  readonly compileErrors: number;
  readonly afterAc: number;
  readonly attempts: number;
  readonly penalty: number;
};

export type TeamStanding = {
  readonly rank: number;
  readonly team: string;
  readonly solved: number;
  readonly penalty: number;
  readonly lastAcMinute: number | null;
  readonly problems: Readonly<Record<string, ProblemCell>>;
};

export const DEFAULT_PENALTY_PER_REJECT = 20;

export function compareStandings(
  _a: Pick<TeamStanding, "solved" | "penalty" | "lastAcMinute">,
  _b: Pick<TeamStanding, "solved" | "penalty" | "lastAcMinute">,
): number {
  throw new Error("todo");
}

export function computeScoreboard(
  _submissions: readonly Submission[],
  _options?: ScoreOptions,
): TeamStanding[] {
  throw new Error("todo");
}
