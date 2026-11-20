import type { Attempt } from "../session/engine";
import type { EditRound } from "../vim/edit-round";
import type { Round } from "../vim/round";
import type { TrainingEvent } from "./event";

/** What `sessionEvents` needs of a stored session. */
export type SessionLike = {
  readonly mode: string;
  readonly finishedAt: number;
  readonly log: readonly Attempt[];
};

/** One event per attempt of a calculation or competitive programming session. */
export function sessionEvents(session: SessionLike): TrainingEvent[] {
  return session.log.map((attempt, i) => ({
    at: session.finishedAt,
    drill: "calc",
    config: session.mode,
    kc: attempt.problem.skill,
    ok: attempt.outcome === "correct",
    timeMs: attempt.timeMs,
    extra: {
      seed: attempt.problem.seed,
      i,
      outcome: attempt.outcome,
      corrections: attempt.corrections,
    },
  }));
}

/** The first command of a solution in Vim notation, without count or register. */
export function mainCommand(solution: string): string {
  let rest = solution;
  for (let prefix = /^(\d+|".?)/.exec(rest); prefix !== null; prefix = /^(\d+|".?)/.exec(rest)) {
    rest = rest.slice(prefix[0].length);
  }
  return /^(<[^>]*>|.)/su.exec(rest)?.[1] ?? "";
}

/** One event per target of a Vim motion round. */
export function motionEvents(
  round: Pick<Round, "config" | "results">,
  at: number,
): TrainingEvent[] {
  return round.results.map((r) => ({
    at,
    drill: "vim.motion",
    config: `L${String(round.config.level)}`,
    kc: mainCommand(r.solution),
    ok: !r.skipped,
    timeMs: r.timeMs,
    extra: {
      seed: r.seed,
      i: r.index,
      keys: r.keys,
      min: r.minimum,
      sol: r.solution,
      skipped: r.skipped,
      snippet: r.snippetId,
    },
  }));
}

/** One event per edit of a Vim edit round. */
export function editEvents(round: Pick<EditRound, "results">, at: number): TrainingEvent[] {
  return round.results.map((r) => ({
    at,
    drill: "vim.edit",
    config: "edit",
    kc: r.kind,
    ok: !r.skipped,
    timeMs: r.timeMs,
    extra: {
      seed: r.seed,
      i: r.index,
      keys: r.keys,
      min: r.referenceKeys,
      sol: r.reference,
      skipped: r.skipped,
      snippet: r.snippetId,
    },
  }));
}
