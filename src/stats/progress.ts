import type { JsonValue } from "../core/problem";
import { MODE_IDS, MODES } from "../modes";
import type { SessionRecord } from "../storage/history";
import type { TextResult } from "../storage/text-typing";
import type { TypingResult } from "../storage/typing";
import type { VimEditResult, VimResult } from "../storage/vim";
import { LANGUAGE_LABELS } from "../typing/corpus";
import { sessionEvents } from "./derive";
import type { TrainingEvent } from "./event";
import { kcCurve, kcStats, type KcStat, type OpportunityPoint } from "./kc";
import {
  detectPlateau,
  fitPowerLaw,
  WEEK_MS,
  weeklyRate,
  type Plateau,
  type PowerLawFit,
  type RoundPoint,
} from "./learning";
import {
  errorChars,
  isCodeSymbol,
  slowestBigrams,
  type BigramStat,
  type CharErrorStat,
} from "./typing-stats";

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

/** Canonical JSON string with sorted object keys for fair config grouping. */
function canonicalJson(value: JsonValue): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const entries = Object.entries(value).sort(([a], [b]) => (a < b ? -1 : 1));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`;
}

function buildSeries(
  key: string,
  label: string,
  unit: string,
  rawRounds: readonly RoundPoint[],
  now: number,
): ConfigSeries {
  const rounds = [...rawRounds].sort((a, b) => a.at - b.at);
  const unassisted = rounds.filter((r) => r.assisted !== true);
  const ref = unassisted.length > 0 ? unassisted : rounds;
  const first = ref[0] as RoundPoint;
  const last = ref[ref.length - 1] as RoundPoint;
  const spanWeeks = Math.max(0, (last.at - first.at) / WEEK_MS);
  return {
    key,
    label,
    unit,
    rounds,
    unassistedCount: unassisted.length,
    fit: fitPowerLaw(rounds),
    plateau: detectPlateau(rounds),
    weeklyRate: weeklyRate(rounds, now),
    firstScore: first.score,
    lastScore: last.score,
    spanWeeks,
  };
}

function groupByConfig<T>(
  items: readonly T[],
  keyOf: (item: T) => string,
  labelOf: (item: T) => string,
  unit: string,
  pointOf: (item: T) => RoundPoint,
  now: number,
): ConfigSeries[] {
  const groups = new Map<string, { label: string; points: RoundPoint[] }>();
  for (const item of items) {
    const key = keyOf(item);
    const entry = groups.get(key);
    if (entry === undefined) {
      groups.set(key, { label: labelOf(item), points: [pointOf(item)] });
    } else {
      entry.points.push(pointOf(item));
    }
  }
  return [...groups.entries()]
    .map(([key, g]) => buildSeries(key, g.label, unit, g.points, now))
    .sort((a, b) => b.rounds.length - a.rounds.length || a.key.localeCompare(b.key));
}

/** Computes progress sections for every drill that has recorded data. */
export function computeProgress(input: ProgressInput, now: number): DrillProgress[] {
  const result: DrillProgress[] = [];

  for (const mode of MODE_IDS) {
    const modeSessions = input.sessions.filter((s) => s.mode === mode);
    if (modeSessions.length === 0) continue;
    const configs = groupByConfig(
      modeSessions,
      (s) =>
        mode === "review"
          ? `${mode}|${String(Math.round(s.durationMs / 1000))}s`
          : `${mode}|${String(Math.round(s.durationMs / 1000))}s|${canonicalJson(s.params)}`,
      (s) => `${String(Math.round(s.durationMs / 1000))} s`,
      "acertos/min",
      (s) => {
        const correct = s.log.filter((a) => a.outcome === "correct").length;
        const minutes = s.durationMs / 60_000;
        return { at: s.finishedAt, score: minutes > 0 ? correct / minutes : correct };
      },
      now,
    );
    const modeEvents = modeSessions.flatMap(sessionEvents);
    result.push({
      id: mode,
      label: MODES[mode].label,
      configs,
      kcs: kcStats(modeEvents),
      kcCurve: kcCurve(modeEvents),
      bigrams: [],
      charErrors: [],
    });
  }

  const weakEvents = input.events.filter((e) => e.drill === "typing.weak");
  const codeWeak = weakEvents.filter((e) => isCodeSymbol(e.kc.replace(/^typing\.ngram\./, "")));
  const textWeak = weakEvents.filter((e) => !isCodeSymbol(e.kc.replace(/^typing\.ngram\./, "")));

  const codeEvents = [...input.events.filter((e) => e.drill === "typing.code"), ...codeWeak];
  if (input.typing.length > 0 || codeEvents.length > 0) {
    result.push({
      id: "typing",
      label: "Digitação: Código",
      configs: groupByConfig(
        input.typing,
        (r) => `typing|${r.language}`,
        (r) => LANGUAGE_LABELS[r.language],
        "WPM",
        (r) => ({ at: r.finishedAt, score: r.wpm }),
        now,
      ),
      kcs: [],
      kcCurve: [],
      bigrams: slowestBigrams(codeEvents),
      charErrors: errorChars(codeEvents),
    });
  }

  const textEvents = [...input.events.filter((e) => e.drill === "typing.text"), ...textWeak];
  if (input.text.length > 0 || textEvents.length > 0) {
    result.push({
      id: "text",
      label: "Digitação: Texto",
      configs: groupByConfig(
        input.text,
        (r) => `text|${r.config}`,
        (r) => r.config,
        "WPM",
        (r) => ({ at: r.finishedAt, score: r.wpm }),
        now,
      ),
      kcs: [],
      kcCurve: [],
      bigrams: slowestBigrams(textEvents),
      charErrors: errorChars(textEvents),
    });
  }

  const motionEvents = input.events.filter((e) => e.drill === "vim.motion");
  if (input.vimMotion.length > 0 || motionEvents.length > 0) {
    result.push({
      id: "vim-motion",
      label: "Vim: Movimento",
      configs: groupByConfig(
        input.vimMotion,
        (r) => `vim-motion|L${String(r.level)}|${String(r.durationS)}s`,
        (r) => `Nível ${String(r.level)} · ${String(r.durationS)} s`,
        "alvos/min",
        (r) => ({
          at: r.finishedAt,
          score: (r.reached / r.durationS) * 60,
          assisted: r.assisted === true,
        }),
        now,
      ),
      kcs: kcStats(motionEvents),
      kcCurve: kcCurve(motionEvents),
      bigrams: [],
      charErrors: [],
    });
  }

  const editEvents = input.events.filter((e) => e.drill === "vim.edit");
  if (input.vimEdit.length > 0 || editEvents.length > 0) {
    result.push({
      id: "vim-edit",
      label: "Vim: Edição",
      configs: groupByConfig(
        input.vimEdit,
        (r) => `vim-edit|${String(r.durationS)}s`,
        (r) => `${String(r.durationS)} s`,
        "edições/min",
        (r) => ({
          at: r.finishedAt,
          score: (r.reached / r.durationS) * 60,
          assisted: r.assisted === true,
        }),
        now,
      ),
      kcs: kcStats(editEvents),
      kcCurve: kcCurve(editEvents),
      bigrams: [],
      charErrors: [],
    });
  }

  return result;
}

/** Formats a signed weekly rate with decimal comma: "+1,3" or "-0,4". */
export function formatSignedRate(rate: number): string {
  const rounded = Math.round(rate * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded.toFixed(1).replace(".", ",")}`;
}

/** Headline summary for one drill configuration (AC-2). */
export function seriesSummaryLine(label: string, series: ConfigSeries): string {
  const from = Math.round(series.firstScore);
  const to = Math.round(series.lastScore);
  const weeks = Math.max(1, Math.round(series.spanWeeks));
  const span =
    series.rounds.length > 1
      ? `${String(from)} → ${String(to)} ${series.unit} em ${String(weeks)} ${weeks === 1 ? "semana" : "semanas"}`
      : `${String(to)} ${series.unit} (1 rodada)`;
  const rate =
    series.weeklyRate !== null ? `, ${formatSignedRate(series.weeklyRate)} por semana` : "";
  return `${label} ${series.label}: ${span}${rate}`;
}
