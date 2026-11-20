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
export function sessionEvents(_session: SessionLike): TrainingEvent[] {
  throw new Error("todo");
}

/** The first command of a solution in Vim notation, without count or register. */
export function mainCommand(_solution: string): string {
  throw new Error("todo");
}

/** One event per target of a Vim motion round. */
export function motionEvents(
  _round: Pick<Round, "config" | "results">,
  _at: number,
): TrainingEvent[] {
  throw new Error("todo");
}

/** One event per edit of a Vim edit round. */
export function editEvents(_round: Pick<EditRound, "results">, _at: number): TrainingEvent[] {
  throw new Error("todo");
}
