import type { SessionRecord } from "../storage/history";
import type { TextResult } from "../storage/text-typing";
import type { TypingResult } from "../storage/typing";
import type { VimEditResult, VimResult } from "../storage/vim";
import type { TrainingEvent } from "./event";
import type { KcStat, OpportunityPoint } from "./kc";
import type { Plateau, PowerLawFit, RoundPoint } from "./learning";
import type { BigramStat, CharErrorStat } from "./typing-stats";

export type ConfigSeries = {
  readonly key: string;
  readonly label: string;
  readonly unit: string;
  readonly rounds: readonly RoundPoint[];
  readonly unassistedCount: number;
  readonly fit: PowerLawFit | null;
  readonly plateau: Plateau | null;
  readonly weeklyRate: number | null;
  readonly firstScore: number;
  readonly lastScore: number;
  readonly spanWeeks: number;
};

export type DrillProgress = {
  readonly id: string;
  readonly label: string;
  readonly configs: readonly ConfigSeries[];
  readonly kcs: readonly KcStat[];
  readonly kcCurve: readonly OpportunityPoint[];
  readonly bigrams: readonly BigramStat[];
  readonly charErrors: readonly CharErrorStat[];
};

export type ProgressInput = {
  readonly sessions: readonly SessionRecord[];
  readonly typing: readonly TypingResult[];
  readonly text: readonly TextResult[];
  readonly vimMotion: readonly VimResult[];
  readonly vimEdit: readonly VimEditResult[];
  readonly events: readonly TrainingEvent[];
};

export function computeProgress(_input: ProgressInput, _now: number): DrillProgress[] {
  throw new Error("todo");
}

export function formatSignedRate(_rate: number): string {
  throw new Error("todo");
}

export function seriesSummaryLine(_label: string, _series: ConfigSeries): string {
  throw new Error("todo");
}
