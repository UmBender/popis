import type { JsonValue } from "../core/problem";

/** The drills that leave events (ADR-T22-1, ADR-T25-1, ADR-T26-1, ADR-T30-1, ADR-T39-1, ADR-T40-1, ADR-T43-1). */
export const DRILLS = [
  "calc",
  "vim.motion",
  "vim.edit",
  "typing.code",
  "typing.text",
  "typing.weak",
  "gdb.cmd",
  "gdb.out",
  "shell.cmd",
  "compile.read",
  "wa.hunt",
  "stl.out",
  "icpc.score",
  "regex.practice",
] as const;

export type Drill = (typeof DRILLS)[number];

/** What every event carries besides its drill-specific data. */
export type EventExtra = {
  /** Seed of the item. */
  readonly seed: number;
  /** Position of the item in its round. */
  readonly i: number;
} & { readonly [key: string]: JsonValue };

/** One item of a round: a problem, target, edit, line or word. */
export type TrainingEvent = {
  /** Wall-clock time the round ended, in epoch milliseconds. */
  readonly at: number;
  readonly drill: Drill;
  /** The mode, level, language or text options of the round. */
  readonly config: string;
  /** Knowledge component: the skill the item trains. */
  readonly kc: string;
  readonly ok: boolean;
  readonly timeMs: number;
  readonly extra: EventExtra;
};

/** Identity of an event, used to avoid duplicates. */
export function eventKey(event: TrainingEvent): string {
  return `${String(event.at)}|${event.drill}|${String(event.extra.seed)}|${String(event.extra.i)}`;
}
