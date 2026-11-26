import { createRng, deriveSeed, retry, type Rng } from "../core/rng";
import {
  compareStandings,
  computeScoreboard,
  DEFAULT_PENALTY_PER_REJECT,
  type Submission,
  type TeamStanding,
  type Verdict,
} from "./score";

export const ICPC_KINDS = ["penalidade", "posicao", "ultrapassar", "escolher"] as const;
export type IcpcKind = (typeof ICPC_KINDS)[number];
export type IcpcKindFilter = "all" | IcpcKind;

export const ICPC_KIND_LABELS: Readonly<Record<IcpcKind, string>> = {
  penalidade: "Penalidade",
  posicao: "Posição",
  ultrapassar: "Ultrapassar",
  escolher: "Escolher problema",
};

export const ICPC_MAX_MINUTE = 300;

export type ProblemRatio = {
  readonly problem: string;
  readonly ac: number;
  readonly attempts: number;
};

type BaseItem = {
  readonly index: number;
  readonly seed: number;
  readonly kc: `icpc.${IcpcKind}`;
  readonly prompt: string;
  readonly canonical: string;
  readonly explanation: string;
  readonly compileErrorCounts: boolean;
  readonly currentMinute: number;
};

export type PenalidadeItem = BaseItem & {
  readonly kind: "penalidade";
  readonly team: string;
  readonly problems: readonly string[];
  readonly submissions: readonly Submission[];
  readonly standing: TeamStanding;
};

export type PosicaoItem = BaseItem & {
  readonly kind: "posicao";
  readonly problems: readonly string[];
  readonly submissions: readonly Submission[];
  readonly before: readonly TeamStanding[];
  readonly newSubmission: Submission;
  readonly after: readonly TeamStanding[];
};

export type UltrapassarItem = BaseItem & {
  readonly kind: "ultrapassar";
  readonly problems: readonly string[];
  readonly submissions: readonly Submission[];
  readonly board: readonly TeamStanding[];
  readonly chaser: string;
  readonly rival: string;
  readonly targetProblem: string;
};

export type EscolherItem = BaseItem & {
  readonly kind: "escolher";
  readonly problemStats: readonly ProblemRatio[];
};

export type IcpcItem = PenalidadeItem | PosicaoItem | UltrapassarItem | EscolherItem;

export type IcpcGenerateOptions = {
  readonly kind?: IcpcKindFilter;
  readonly compileErrorCounts?: boolean;
};

const TEAM_NAMES = [
  "Café Segfault",
  "O(1) na Fé",
  "TLE Exemplo",
  "Balão Vazio",
  "AC no 299",
  "DP na Raça",
  "BFS Escuro",
  "Bitmaskers",
  "Greedy Puro",
  "WA Caso 2",
  "Grafo Conexo",
  "Busca Binária",
] as const;

const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;
const REJECT_VERDICTS: readonly Verdict[] = ["WA", "TLE", "RTE", "MLE"];

function pickDistinct<T>(rng: Rng, pool: readonly T[], count: number): T[] {
  const copy = [...pool];
  const out: T[] = [];
  for (let i = 0; i < count; i += 1) {
    const idx = rng.int(i, copy.length - 1);
    const chosen = copy[idx] as T;
    copy[idx] = copy[i] as T;
    out.push(chosen);
  }
  return out;
}

function pickDistinctMinutes(rng: Rng, lo: number, hi: number, count: number): number[] {
  const used = new Set<number>();
  const out: number[] = [];
  let cursor = lo;
  const span = Math.max(1, hi - lo + 1);
  for (let i = 0; i < count; i += 1) {
    const candidate = rng.int(lo, hi);
    if (!used.has(candidate)) {
      used.add(candidate);
      out.push(candidate);
    } else {
      while (used.has(cursor) && cursor < lo + span) cursor += 1;
      used.add(cursor);
      out.push(cursor);
    }
  }
  return out.sort((a, b) => a - b);
}

function sortSubmissions(subs: Submission[]): Submission[] {
  return subs.sort((a, b) => {
    if (a.minute !== b.minute) return a.minute - b.minute;
    if (a.problem !== b.problem) return a.problem < b.problem ? -1 : 1;
    return a.team < b.team ? -1 : a.team > b.team ? 1 : 0;
  });
}

function generatePenalidade(
  rng: Rng,
  seed: number,
  index: number,
  compileErrorCounts: boolean,
): PenalidadeItem {
  const team = rng.pick(TEAM_NAMES);
  const probCount = rng.int(4, 5);
  const problems = LETTERS.slice(0, probCount);
  const solvedCount = rng.int(2, probCount - 1);
  const solvedSet = new Set(pickDistinct(rng, problems, solvedCount));

  const solvedList = problems.filter((p) => solvedSet.has(p));
  const unsolvedList = problems.filter((p) => !solvedSet.has(p));

  const ceProblem = rng.next() < 0.7 ? rng.pick(solvedList) : null;
  const afterAcProblem = rng.next() < 0.65 ? rng.pick(solvedList) : null;
  const rejectedUnsolved = rng.pick(unsolvedList);

  const submissions: Submission[] = [];

  for (const problem of problems) {
    if (solvedSet.has(problem)) {
      const acMinute = rng.int(20, 230);
      const rejectsBefore = rng.int(0, 3);
      const hasCe = problem === ceProblem;
      const beforeCount = rejectsBefore + (hasCe ? 1 : 0);
      const mins = pickDistinctMinutes(rng, 2, acMinute - 1, beforeCount);
      for (let i = 0; i < rejectsBefore; i += 1) {
        submissions.push({
          team,
          problem,
          minute: mins[i]!,
          verdict: rng.pick(REJECT_VERDICTS),
        });
      }
      if (hasCe) {
        submissions.push({
          team,
          problem,
          minute: mins[rejectsBefore]!,
          verdict: "CE",
        });
      }
      submissions.push({ team, problem, minute: acMinute, verdict: "AC" });

      if (problem === afterAcProblem) {
        const afterMin = rng.int(acMinute + 4, Math.min(ICPC_MAX_MINUTE - 1, acMinute + 40));
        submissions.push({
          team,
          problem,
          minute: afterMin,
          verdict: rng.pick(REJECT_VERDICTS),
        });
      }
    } else if (problem === rejectedUnsolved || rng.next() < 0.5) {
      const count = rng.int(1, 3);
      const mins = pickDistinctMinutes(rng, 10, 260, count);
      for (const minute of mins) {
        submissions.push({
          team,
          problem,
          minute,
          verdict: rng.next() < 0.2 ? "CE" : rng.pick(REJECT_VERDICTS),
        });
      }
    }
  }

  sortSubmissions(submissions);
  const maxMinute = submissions.reduce((acc, s) => Math.max(acc, s.minute), 30);
  const currentMinute = Math.min(ICPC_MAX_MINUTE, maxMinute + rng.int(0, 10));

  const [standing] = computeScoreboard(submissions, {
    compileErrorCounts,
    teams: [team],
    problems,
  });
  const row = standing!;

  const parts: string[] = [];
  for (const p of problems) {
    const cell = row.problems[p]!;
    if (cell.solved && cell.acMinute !== null) {
      const base =
        cell.rejected > 0
          ? `${p}: ${String(cell.acMinute)} + 20×${String(cell.rejected)} = ${String(cell.penalty)}`
          : `${p}: ${String(cell.acMinute)}`;
      const notes: string[] = [];
      if (cell.compileErrors > 0 && !compileErrorCounts) notes.push("CE ignorado");
      if (cell.afterAc > 0) notes.push("pós-AC ignorado");
      parts.push(notes.length > 0 ? `${base} (${notes.join(", ")})` : base);
    }
  }
  const unsolvedWithAttempts = problems.filter((p) => {
    const c = row.problems[p]!;
    return !c.solved && (c.rejected > 0 || c.compileErrors > 0);
  });
  if (unsolvedWithAttempts.length > 0) {
    parts.push(`${unsolvedWithAttempts.join("/")} sem AC: 0`);
  }

  return {
    kind: "penalidade",
    index,
    seed,
    kc: "icpc.penalidade",
    compileErrorCounts,
    currentMinute,
    team,
    problems,
    submissions,
    standing: row,
    prompt: `Qual é a penalidade total (em minutos) do time ${team}?`,
    canonical: String(row.penalty),
    explanation: `${parts.join("; ")}. Total = ${String(row.penalty)} min.`,
  };
}

function buildTeamSubmissions(
  rng: Rng,
  team: string,
  problems: readonly string[],
  solvedCount: number,
  minAc: number,
  maxAc: number,
  maxRejects: number,
): Submission[] {
  const subs: Submission[] = [];
  const solvedSet = new Set(pickDistinct(rng, problems, solvedCount));

  for (const problem of problems) {
    if (solvedSet.has(problem)) {
      const acMinute = rng.int(minAc, maxAc);
      const rejects = rng.int(0, maxRejects);
      const mins = pickDistinctMinutes(rng, 2, Math.max(3, acMinute - 1), rejects);
      for (const minute of mins) {
        subs.push({ team, problem, minute, verdict: rng.pick(REJECT_VERDICTS) });
      }
      subs.push({ team, problem, minute: acMinute, verdict: "AC" });
    } else if (rng.next() < 0.45) {
      const rejects = rng.int(1, 2);
      const mins = pickDistinctMinutes(rng, 8, maxAc, rejects);
      for (const minute of mins) {
        subs.push({ team, problem, minute, verdict: rng.pick(REJECT_VERDICTS) });
      }
    }
  }

  return subs;
}

function generatePosicao(
  rng: Rng,
  seed: number,
  index: number,
  compileErrorCounts: boolean,
): PosicaoItem {
  const probCount = rng.int(4, 5);
  const problems = LETTERS.slice(0, probCount);
  const teamCount = rng.int(4, 5);
  const teams = pickDistinct(rng, TEAM_NAMES, teamCount);

  return retry(() => {
    const currentMinute = rng.int(110, 275);
    const submissions: Submission[] = [];

    for (const team of teams) {
      const solvedCount = rng.int(1, probCount - 1);
      submissions.push(
        ...buildTeamSubmissions(rng, team, problems, solvedCount, 12, currentMinute - 12, 2),
      );
    }

    sortSubmissions(submissions);
    const before = computeScoreboard(submissions, { compileErrorCounts, teams, problems });

    // Prefer a team not already in 1st place so an AC can overtake others.
    const candidates = before.slice(1);
    const targetBefore = rng.pick(candidates);
    const unsolved = problems.filter((p) => !targetBefore.problems[p]!.solved);
    const targetProblem = rng.pick(unsolved);

    const roll = rng.next();
    const verdict: Verdict =
      roll < 0.78 ? "AC" : roll < 0.9 ? rng.pick(REJECT_VERDICTS) : "CE";

    const newSubmission: Submission = {
      team: targetBefore.team,
      problem: targetProblem,
      minute: currentMinute,
      verdict,
    };

    const after = computeScoreboard([...submissions, newSubmission], {
      compileErrorCounts,
      teams,
      problems,
    });

    const targetAfter = after.find((r) => r.team === targetBefore.team)!;
    const tiedCount = after.filter((r) => compareStandings(r, targetAfter) === 0).length;
    if (tiedCount !== 1) return null;

    const verb =
      verdict === "AC"
        ? `resolve ${targetProblem} no min ${String(currentMinute)}`
        : `recebe ${verdict} em ${targetProblem} no min ${String(currentMinute)}`;
    const lastStr =
      targetAfter.lastAcMinute !== null ? `, último AC ${String(targetAfter.lastAcMinute)}` : "";

    return {
      kind: "posicao",
      index,
      seed,
      kc: "icpc.posicao",
      compileErrorCounts,
      currentMinute,
      problems,
      submissions,
      before,
      newSubmission,
      after,
      prompt: `${targetBefore.team} ${verb}. Qual passa a ser a posição do time no placar?`,
      canonical: String(targetAfter.rank),
      explanation: `Depois da submissão (${verdict}), ${targetBefore.team} fica com ${String(targetAfter.solved)} AC, ${String(targetAfter.penalty)} min${lastStr} → ${String(targetAfter.rank)}º lugar.`,
    };
  }, (item): item is PosicaoItem => item !== null);
}

function generateUltrapassar(
  rng: Rng,
  seed: number,
  index: number,
  compileErrorCounts: boolean,
): UltrapassarItem {
  const probCount = rng.int(4, 5);
  const problems = LETTERS.slice(0, probCount);
  const teamCount = rng.int(4, 5);
  const teams = pickDistinct(rng, TEAM_NAMES, teamCount);
  const chaser = teams[0]!;
  const rival = teams[1]!;
  const others = teams.slice(2);

  return retry(() => {
    const baseSolved = rng.int(1, Math.min(2, probCount - 2));
    const chaserSubs: Submission[] = [];
    const chaserSolved = pickDistinct(rng, problems, baseSolved);
    const chaserSolvedSet = new Set(chaserSolved);

    for (const problem of chaserSolved) {
      const acMinute = rng.int(10, 65);
      const rejects = rng.int(0, 1);
      const mins = pickDistinctMinutes(rng, 2, acMinute - 1, rejects);
      for (const minute of mins) {
        chaserSubs.push({ team: chaser, problem, minute, verdict: rng.pick(REJECT_VERDICTS) });
      }
      chaserSubs.push({ team: chaser, problem, minute: acMinute, verdict: "AC" });
    }

    const chaserUnsolved = problems.filter((p) => !chaserSolvedSet.has(p));
    const targetProblem = rng.pick(chaserUnsolved);
    const priorRejects = rng.int(0, 2);
    const hasCe = rng.next() < 0.35;
    const targetMins = pickDistinctMinutes(rng, 18, 105, priorRejects + (hasCe ? 1 : 0));
    for (let i = 0; i < priorRejects; i += 1) {
      chaserSubs.push({
        team: chaser,
        problem: targetProblem,
        minute: targetMins[i]!,
        verdict: rng.pick(REJECT_VERDICTS),
      });
    }
    if (hasCe) {
      chaserSubs.push({
        team: chaser,
        problem: targetProblem,
        minute: targetMins[priorRejects]!,
        verdict: "CE",
      });
    }

    const rivalSubs: Submission[] = [];
    const rivalSolved = pickDistinct(rng, problems, baseSolved + 1);
    for (const problem of rivalSolved) {
      const acMinute = rng.int(35, 130);
      const rejects = rng.int(1, 3);
      const mins = pickDistinctMinutes(rng, 4, acMinute - 1, rejects);
      for (const minute of mins) {
        rivalSubs.push({ team: rival, problem, minute, verdict: rng.pick(REJECT_VERDICTS) });
      }
      rivalSubs.push({ team: rival, problem, minute: acMinute, verdict: "AC" });
    }

    const otherSubs: Submission[] = [];
    for (const team of others) {
      const solvedCount = rng.int(1, probCount - 1);
      otherSubs.push(...buildTeamSubmissions(rng, team, problems, solvedCount, 12, 130, 2));
    }

    const submissions = sortSubmissions([...chaserSubs, ...rivalSubs, ...otherSubs]);
    const latestSubMinute = submissions.reduce((acc, s) => Math.max(acc, s.minute), 20);
    const currentMinute = latestSubMinute + rng.int(2, 15);
    if (currentMinute >= ICPC_MAX_MINUTE - 5) return null;

    const opts = { compileErrorCounts, teams, problems };
    const board = computeScoreboard(submissions, opts);
    const chaserRow = board.find((r) => r.team === chaser)!;
    const rivalRow = board.find((r) => r.team === rival)!;

    if (compareStandings(rivalRow, chaserRow) >= 0) return null;

    const penalizedOnTarget = chaserRow.problems[targetProblem]!.rejected;
    // Since m >= currentMinute >= rivalRow.lastAcMinute, tying penalty loses or ties lastAcMinute;
    // chaser strictly passes iff chaserPenalty + m + 20 * penalizedOnTarget < rivalPenalty.
    const maxMinute =
      rivalRow.penalty - chaserRow.penalty - DEFAULT_PENALTY_PER_REJECT * penalizedOnTarget - 1;

    if (maxMinute < currentMinute || maxMinute >= ICPC_MAX_MINUTE) return null;

    // Cross-check exact boundary with computeScoreboard.
    const atMax = computeScoreboard(
      [...submissions, { team: chaser, problem: targetProblem, minute: maxMinute, verdict: "AC" }],
      opts,
    );
    const atNext = computeScoreboard(
      [
        ...submissions,
        { team: chaser, problem: targetProblem, minute: maxMinute + 1, verdict: "AC" },
      ],
      opts,
    );

    const chaserMax = atMax.find((r) => r.team === chaser)!;
    const rivalMax = atMax.find((r) => r.team === rival)!;
    const chaserNext = atNext.find((r) => r.team === chaser)!;
    const rivalNext = atNext.find((r) => r.team === rival)!;
    if (compareStandings(chaserMax, rivalMax) >= 0 || compareStandings(chaserNext, rivalNext) < 0) {
      return null;
    }

    const rejectNote =
      penalizedOnTarget > 0
        ? ` + ${String(DEFAULT_PENALTY_PER_REJECT * penalizedOnTarget)} min de ${String(penalizedOnTarget)} rejeição(ões) em ${targetProblem}`
        : "";

    return {
      kind: "ultrapassar",
      index,
      seed,
      kc: "icpc.ultrapassar",
      compileErrorCounts,
      currentMinute,
      problems,
      submissions,
      board,
      chaser,
      rival,
      targetProblem,
      prompt: `Aos ${String(currentMinute)} min, até que minuto ${chaser} precisa de AC em ${targetProblem} (sem novos erros) para passar ${rival}?`,
      canonical: String(maxMinute),
      explanation: `${rival} tem ${String(rivalRow.penalty)} min; ${chaser} tem ${String(chaserRow.penalty)} min${rejectNote}. Precisa fechar abaixo de ${String(rivalRow.penalty)} min (empate perde no último AC) → até o minuto ${String(maxMinute)}.`,
    };
  }, (item): item is UltrapassarItem => item !== null);
}

function generateEscolher(
  rng: Rng,
  seed: number,
  index: number,
  compileErrorCounts: boolean,
): EscolherItem {
  const probCount = rng.int(5, 7);
  const problems = LETTERS.slice(0, probCount);
  const currentMinute = rng.int(45, 255);
  const bestIdx = rng.int(0, probCount - 1);

  const bestAttempts = rng.int(12, 36);
  const bestPct = rng.int(55, 86);
  const bestAc = Math.max(3, Math.min(bestAttempts, Math.round((bestAttempts * bestPct) / 100)));
  const bestRate = bestAc / bestAttempts;

  // Pick one decoy index that tries to have more raw ACs than bestAc, at a lower rate.
  const decoyIdx = (bestIdx + rng.int(1, probCount - 1)) % probCount;

  const stats: ProblemRatio[] = [];
  for (let i = 0; i < probCount; i += 1) {
    const problem = problems[i]!;
    if (i === bestIdx) {
      stats.push({ problem, ac: bestAc, attempts: bestAttempts });
      continue;
    }

    let attempts: number;
    let ac: number;
    if (i === decoyIdx) {
      const targetRate = Math.max(0.2, bestRate - rng.int(8, 18) / 100);
      attempts = Math.max(bestAttempts + 8, Math.ceil((bestAc + 3) / targetRate));
      ac = Math.min(attempts - 1, Math.floor((bestRate - 0.05) * attempts));
    } else {
      attempts = rng.int(8, 60);
      const maxAc = Math.max(0, Math.floor((bestRate - 0.05) * attempts));
      ac = rng.int(0, maxAc);
    }

    while (ac > 0 && bestAc * attempts <= ac * bestAttempts) {
      ac -= 1;
    }
    stats.push({ problem, ac, attempts });
  }

  const sorted = [...stats].sort((a, b) => b.ac * a.attempts - a.ac * b.attempts);
  const best = sorted[0]!;
  const runnerUp = sorted[1]!;

  const bestPctText = String(Math.round((best.ac / best.attempts) * 100));
  const secondPctText = String(Math.round((runnerUp.ac / runnerUp.attempts) * 100));

  return {
    kind: "escolher",
    index,
    seed,
    kc: "icpc.escolher",
    compileErrorCounts,
    currentMinute,
    problemStats: stats,
    prompt: "Olhando ACs e tentativas por problema, qual tem a maior taxa de acerto?",
    canonical: best.problem,
    explanation: `${best.problem} tem ${String(best.ac)}/${String(best.attempts)} (${bestPctText}%), acima de ${runnerUp.problem} com ${String(runnerUp.ac)}/${String(runnerUp.attempts)} (${secondPctText}%).`,
  };
}

/** Deterministic generator for the four ICPC scoreboard drill kinds (T43 AC-2, ADR-T43-1). */
export function generateIcpcItem(
  seed: number,
  index: number,
  options?: IcpcGenerateOptions,
): IcpcItem {
  const itemSeed = deriveSeed(seed, index);
  const rng = createRng(itemSeed);
  const filter = options?.kind ?? "all";
  const compileErrorCounts = options?.compileErrorCounts ?? false;
  const kind: IcpcKind = filter === "all" ? rng.pick(ICPC_KINDS) : filter;

  switch (kind) {
    case "penalidade":
      return generatePenalidade(rng, itemSeed, index, compileErrorCounts);
    case "posicao":
      return generatePosicao(rng, itemSeed, index, compileErrorCounts);
    case "ultrapassar":
      return generateUltrapassar(rng, itemSeed, index, compileErrorCounts);
    case "escolher":
      return generateEscolher(rng, itemSeed, index, compileErrorCounts);
  }
}
