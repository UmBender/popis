export const VERDICTS = ["AC", "WA", "TLE", "MLE", "RTE", "PE", "CE"] as const;
export type Verdict = (typeof VERDICTS)[number];

export type Submission = {
  readonly team: string;
  readonly problem: string;
  readonly minute: number;
  readonly verdict: Verdict;
};

export type ScoreOptions = {
  /** Whether CE counts as a penalized rejected submission before AC. Default: false (WF rule). */
  readonly compileErrorCounts?: boolean;
  /** Penalty minutes per rejected submission before the first AC. Default: 20. */
  readonly penaltyPerReject?: number;
  /** Optional explicit list of teams so teams with 0 submissions still appear. */
  readonly teams?: readonly string[];
  /** Optional explicit list of problems so unattempted problems still have cells. */
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

/**
 * Compares two standings by ICPC ranking criteria (ignoring team name):
 * solved DESC, penalty ASC, lastAcMinute ASC.
 */
export function compareStandings(
  a: Pick<TeamStanding, "solved" | "penalty" | "lastAcMinute">,
  b: Pick<TeamStanding, "solved" | "penalty" | "lastAcMinute">,
): number {
  if (a.solved !== b.solved) return b.solved - a.solved;
  if (a.penalty !== b.penalty) return a.penalty - b.penalty;
  return (a.lastAcMinute ?? 0) - (b.lastAcMinute ?? 0);
}

function scoreProblem(
  problem: string,
  subs: readonly Submission[],
  compileErrorCounts: boolean,
  penaltyPerReject: number,
): ProblemCell {
  let acMinute: number | null = null;
  for (const s of subs) {
    if (s.verdict === "AC" && (acMinute === null || s.minute < acMinute)) {
      acMinute = s.minute;
    }
  }

  let rejected = 0;
  let compileErrors = 0;
  let afterAc = 0;

  for (const s of subs) {
    if (acMinute !== null) {
      if (s.minute > acMinute) {
        afterAc += 1;
      } else if (s.verdict !== "AC") {
        if (s.verdict === "CE") {
          compileErrors += 1;
          if (compileErrorCounts) rejected += 1;
        } else {
          rejected += 1;
        }
      }
    } else if (s.verdict === "CE") {
      compileErrors += 1;
      if (compileErrorCounts) rejected += 1;
    } else {
      rejected += 1;
    }
  }

  const solved = acMinute !== null;
  const attempts = solved ? rejected + 1 : rejected;
  const penalty = acMinute !== null ? acMinute + penaltyPerReject * rejected : 0;

  return {
    problem,
    solved,
    acMinute,
    rejected,
    compileErrors,
    afterAc,
    attempts,
    penalty,
  };
}

/** Pure ICPC / Maratona SBC scoreboard calculation (T43 AC-1, ADR-T43-1). */
export function computeScoreboard(
  submissions: readonly Submission[],
  options?: ScoreOptions,
): TeamStanding[] {
  const compileErrorCounts = options?.compileErrorCounts ?? false;
  const penaltyPerReject = options?.penaltyPerReject ?? DEFAULT_PENALTY_PER_REJECT;

  const teamSet = new Set<string>(options?.teams ?? []);
  const problemSet = new Set<string>(options?.problems ?? []);
  const grouped = new Map<string, Map<string, Submission[]>>();

  for (const s of submissions) {
    teamSet.add(s.team);
    problemSet.add(s.problem);
    let byProblem = grouped.get(s.team);
    if (byProblem === undefined) {
      byProblem = new Map<string, Submission[]>();
      grouped.set(s.team, byProblem);
    }
    let list = byProblem.get(s.problem);
    if (list === undefined) {
      list = [];
      byProblem.set(s.problem, list);
    }
    list.push(s);
  }

  const allProblems = [...problemSet];
  const raw: Omit<TeamStanding, "rank">[] = [];

  for (const team of teamSet) {
    const byProblem = grouped.get(team);
    const cells: Record<string, ProblemCell> = {};
    let solved = 0;
    let penalty = 0;
    let lastAcMinute: number | null = null;

    for (const problem of allProblems) {
      const subs = byProblem?.get(problem) ?? [];
      const cell = scoreProblem(problem, subs, compileErrorCounts, penaltyPerReject);
      cells[problem] = cell;
      if (cell.solved && cell.acMinute !== null) {
        solved += 1;
        penalty += cell.penalty;
        lastAcMinute =
          lastAcMinute === null ? cell.acMinute : Math.max(lastAcMinute, cell.acMinute);
      }
    }

    raw.push({ team, solved, penalty, lastAcMinute, problems: cells });
  }

  raw.sort((a, b) => {
    const cmp = compareStandings(a, b);
    if (cmp !== 0) return cmp;
    return a.team < b.team ? -1 : 1;
  });

  const standings: TeamStanding[] = [];
  for (let i = 0; i < raw.length; i += 1) {
    const entry = raw[i]!;
    const prev = standings[i - 1];
    const rank = prev !== undefined && compareStandings(prev, entry) === 0 ? prev.rank : i + 1;
    standings.push({ rank, ...entry });
  }

  return standings;
}
