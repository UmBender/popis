import { modeOfSkill } from "../gen/review";
import { isMode, type Mode } from "../modes";
import type { DailyMode, DailySessionRecord } from "../storage/adaptive";
import type { ReviewCard } from "../storage/review";
import {
  chooseNextLevel,
  DEFAULT_TARGET_ACCURACY,
  defaultLevelRatings,
  drillLevelCount,
  INITIAL_ELO,
  type AutoLevelDrill,
  type EloState,
} from "./elo";
import type { TrainingEvent } from "./event";
import { CV_STABLE_THRESHOLD, kcStats, type KcStat } from "./kc";
import type { Plateau } from "./learning";
import type { DrillProgress } from "./progress";
import { DAY_MS } from "./summary";

export const PLATEAU_RECOMMEND_MS = 14 * DAY_MS;
export const HIGH_ACCURACY_THRESHOLD = 0.97;
export const LOW_ACCURACY_THRESHOLD = 0.7;
export const MIN_ACCURACY_SAMPLE = 5;
export const MIN_HIGH_ACCURACY_SAMPLE = 10;
export const STALLED_OPPORTUNITIES = 20;

export type RecommendationKind = "plateau" | "high-accuracy" | "low-accuracy" | "stalled-kc";

export type Recommendation = {
  readonly kind: RecommendationKind;
  readonly drillId: string;
  readonly kc?: string;
  readonly lessonId?: string;
  readonly message: string;
};

export type RecommendationInput = {
  readonly drillId: string;
  readonly isVim?: boolean;
  readonly plateau: Plateau | null;
  readonly events: readonly TrainingEvent[];
  readonly kcs: readonly KcStat[];
  readonly now: number;
  readonly findLesson?: (kc: string) => string | undefined;
  readonly labelOfKc?: (kc: string) => string;
};

export type DailyBlock = {
  readonly id: string;
  readonly kind: "review" | "kc";
  readonly title: string;
  readonly reason: string;
  readonly drill: "review" | Mode | "vim-motion" | "vim-edit";
  readonly kc: string | null;
  readonly level: number | null;
  readonly durationS: number;
};

export type DailyPlan = {
  readonly mode: DailyMode;
  readonly estimatedMinutes: number;
  readonly blocks: readonly DailyBlock[];
};

export type ModeExperimentStats = {
  readonly sessions: number;
  readonly weeks: number;
  readonly meanAccuracy: number;
  readonly meanHitsPerMin: number;
  readonly gainHitsPerMin: number;
};

export type DailyExperimentSummary = {
  readonly interleaved: ModeExperimentStats | null;
  readonly blocked: ModeExperimentStats | null;
};

function cvOf(values: readonly number[]): number | null {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean <= 0) return null;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance) / mean;
}

/** True when a KC has >= 20 opportunities and error rate did not fall between first and second half. */
export function isKcStalled(events: readonly TrainingEvent[], kc: string): boolean {
  const list = events
    .filter((e) => e.kc === kc)
    .sort((a, b) => a.at - b.at || a.extra.i - b.extra.i);
  if (list.length < STALLED_OPPORTUNITIES) return false;
  const mid = Math.floor(list.length / 2);
  const early = list.slice(0, mid);
  const late = list.slice(mid);
  const earlyErr = early.filter((e) => !e.ok).length / early.length;
  const lateErr = late.filter((e) => !e.ok).length / late.length;
  return lateErr > 0.05 && earlyErr - lateErr < 0.1;
}

/**
 * Evaluates the 4 recommendation rules for one drill (AC-5).
 * Every text uses honest wording ("deve ajudar") without promising numeric gains.
 */
export function recommendForDrill(input: RecommendationInput): Recommendation[] {
  const recs: Recommendation[] = [];
  const {
    drillId,
    isVim = false,
    plateau,
    events,
    kcs,
    now,
    findLesson,
    labelOfKc = (kc) => kc,
  } = input;

  // Rule 1: plateau for >= 2 weeks
  if (plateau !== null && now - plateau.since >= PLATEAU_RECOMMEND_MS) {
    recs.push({
      kind: "plateau",
      drillId,
      message:
        "Platô há mais de 2 semanas: subir o nível ou intercalar no Treino do dia deve ajudar a destravar o ritmo.",
    });
  }

  // Rule 2 & 3: overall accuracy
  if (events.length >= MIN_ACCURACY_SAMPLE) {
    const hits = events.filter((e) => e.ok);
    const accuracy = hits.length / events.length;
    if (events.length >= MIN_HIGH_ACCURACY_SAMPLE && accuracy > HIGH_ACCURACY_THRESHOLD) {
      const cv = cvOf(hits.map((e) => e.timeMs));
      if (cv !== null && cv <= CV_STABLE_THRESHOLD) {
        recs.push({
          kind: "high-accuracy",
          drillId,
          message:
            "Precisão acima de 97% com velocidade estável: subir o nível deve ajudar a manter o aprendizado ativo.",
        });
      }
    } else if (accuracy < LOW_ACCURACY_THRESHOLD) {
      recs.push({
        kind: "low-accuracy",
        drillId,
        message: isVim
          ? "Precisão abaixo de 70%: descer um nível ou usar a prévia do ótimo deve ajudar a consolidar os comandos."
          : "Precisão abaixo de 70%: descer um nível deve ajudar a firmar a base antes de acelerar.",
      });
    }
  }

  // Rule 4: KC without improvement after 20 opportunities
  for (const stat of kcs) {
    if (!isKcStalled(events, stat.kc)) continue;
    const lessonId = isVim ? findLesson?.(stat.kc) : undefined;
    const label = labelOfKc(stat.kc);
    recs.push({
      kind: "stalled-kc",
      drillId,
      kc: stat.kc,
      ...(lessonId !== undefined ? { lessonId } : {}),
      message:
        lessonId !== undefined
          ? `\`${label}\` sem melhora após 20 oportunidades: revisar a lição no Aprender deve ajudar.`
          : `\`${label}\` sem melhora após 20 oportunidades: um treino focado só nessa habilidade deve ajudar.`,
    });
  }

  return recs;
}

function eventsForDrill(drillId: string, allEvents: readonly TrainingEvent[]): TrainingEvent[] {
  if (drillId === "vim-motion") return allEvents.filter((e) => e.drill === "vim.motion");
  if (drillId === "vim-edit") return allEvents.filter((e) => e.drill === "vim.edit");
  if (drillId === "typing") return allEvents.filter((e) => e.drill === "typing.code");
  if (drillId === "text") return allEvents.filter((e) => e.drill === "typing.text");
  return allEvents.filter(
    (e) => e.drill === "calc" && (e.config === drillId || modeOfSkill(e.kc) === drillId),
  );
}

/** Computes recommendations for every drill section in Evolução. */
export function recommendAll(
  drills: readonly DrillProgress[],
  allEvents: readonly TrainingEvent[],
  now: number,
  findLesson?: (kc: string) => string | undefined,
  labelOfKc?: (kc: string) => string,
): Readonly<Record<string, readonly Recommendation[]>> {
  const result: Record<string, readonly Recommendation[]> = {};
  for (const drill of drills) {
    const primary = drill.configs[0];
    const isVim = drill.id === "vim-motion" || drill.id === "vim-edit";
    result[drill.id] = recommendForDrill({
      drillId: drill.id,
      isVim,
      plateau: primary?.plateau ?? null,
      events: eventsForDrill(drill.id, allEvents),
      kcs: drill.kcs,
      now,
      findLesson,
      labelOfKc,
    });
  }
  return result;
}

function fmtDecimal(value: number, digits = 1): string {
  return value.toFixed(digits).replace(".", ",");
}

function drillOfEvent(event: TrainingEvent): Mode | "vim-motion" | "vim-edit" {
  if (event.drill === "vim.motion") return "vim-motion";
  if (event.drill === "vim.edit") return "vim-edit";
  const m = modeOfSkill(event.kc);
  return isMode(m) && m !== "review" ? m : "arithmetic";
}

function isAutoLevelDrill(drill: string): drill is AutoLevelDrill {
  return (
    drill === "vim-motion" || drill === "arithmetic" || drill === "estimation" || drill === "sums"
  );
}

function reasonForKc(stat: KcStat, label: string): string {
  if (stat.stability === "irregular" && stat.cv !== null) {
    return `\`${label}\` está irregular: CV ${fmtDecimal(stat.cv, 1)}`;
  }
  if (stat.accuracy < 0.8) {
    return `\`${label}\` com precisão de ${String(Math.round(stat.accuracy * 100))}% (BIS ${fmtDecimal(stat.bis, 2)})`;
  }
  return `\`${label}\` está entre os menores BIS (${fmtDecimal(stat.bis, 2)})`;
}

/**
 * Builds a 5–10 minute daily workout combining due FSRS review cards and the 3
 * weakest KCs by BIS, each placed at its Elo-recommended level (AC-4).
 */
export function buildDailyPlan({
  dueCards,
  events,
  elo,
  mode,
  targetAccuracy = DEFAULT_TARGET_ACCURACY,
  labelOfKc = (kc) => kc,
}: {
  readonly dueCards: readonly ReviewCard[];
  readonly events: readonly TrainingEvent[];
  readonly elo: EloState;
  readonly mode: DailyMode;
  readonly targetAccuracy?: number;
  readonly labelOfKc?: (kc: string) => string;
}): DailyPlan {
  const trainable = events.filter(
    (e) => e.drill === "calc" || e.drill === "vim.motion" || e.drill === "vim.edit",
  );
  const weakKcs = kcStats(trainable).slice(0, 3);
  const sampleByKc = new Map<string, TrainingEvent>();
  for (const e of trainable) sampleByKc.set(e.kc, e);

  const kcBlocks: DailyBlock[] = weakKcs.map((stat, idx) => {
    const sample = sampleByKc.get(stat.kc)!;
    const drill = drillOfEvent(sample);
    const label = labelOfKc(stat.kc);
    let level: number | null = null;
    if (isAutoLevelDrill(drill)) {
      const count = drillLevelCount(drill);
      const ratings = defaultLevelRatings(count);
      const userRating = elo.users[stat.kc]?.rating ?? INITIAL_ELO;
      level = chooseNextLevel({
        currentLevel: Math.ceil(count / 2),
        userRating,
        levelRatings: ratings,
        targetAccuracy,
      });
    }
    return {
      id: `kc-${String(idx)}-${stat.kc}`,
      kind: "kc",
      title: label,
      reason: reasonForKc(stat, label),
      drill,
      kc: stat.kc,
      level,
      durationS: 120,
    };
  });

  const blocks: DailyBlock[] = [];
  if (dueCards.length > 0) {
    const reviewBlock: DailyBlock = {
      id: "review-due",
      kind: "review",
      title: "Revisão espaçada (FSRS)",
      reason:
        dueCards.length === 1
          ? "1 cartão vencido no Revisar"
          : `${String(dueCards.length)} cartões vencidos no Revisar`,
      drill: "review",
      kc: null,
      level: null,
      durationS: 120,
    };
    if (mode === "interleaved" && kcBlocks.length > 0) {
      blocks.push(reviewBlock, kcBlocks[0]!);
      for (let i = 1; i < kcBlocks.length; i++) blocks.push(kcBlocks[i]!);
    } else {
      blocks.push(reviewBlock, ...kcBlocks);
    }
  } else {
    blocks.push(...kcBlocks);
  }

  // Starter blocks when no history or due cards exist yet (keeps 5–10 min total).
  if (blocks.length === 0) {
    blocks.push(
      {
        id: "starter-arithmetic",
        kind: "kc",
        title: "Aritmética",
        reason: "Sem histórico ainda: aquecimento para calibrar seu nível inicial.",
        drill: "arithmetic",
        kc: "arithmetic.add",
        level: 2,
        durationS: 120,
      },
      {
        id: "starter-estimation",
        kind: "kc",
        title: "Estimativa",
        reason: "Sem histórico ainda: medir complexidade e ordem de grandeza.",
        drill: "estimation",
        kc: "estimation.complexity",
        level: 1,
        durationS: 120,
      },
      {
        id: "starter-vim",
        kind: "kc",
        title: "Vim: Movimento",
        reason: "Sem histórico ainda: calibrar movimentos básicos no Vim.",
        drill: "vim-motion",
        kc: "w",
        level: 2,
        durationS: 120,
      },
    );
  }

  const totalS = blocks.reduce((sum, b) => sum + b.durationS, 0);
  const estimatedMinutes = Math.min(10, Math.max(5, Math.round(totalS / 60)));
  return { mode, estimatedMinutes, blocks };
}

function summarizeMode(sessions: readonly DailySessionRecord[]): ModeExperimentStats | null {
  if (sessions.length === 0) return null;
  const sorted = [...sessions].sort((a, b) => a.finishedAt - b.finishedAt);
  const weeks = new Set(sorted.map((s) => s.week)).size;
  const meanAccuracy = sorted.reduce((sum, s) => sum + s.accuracy, 0) / sorted.length;
  const meanHitsPerMin = sorted.reduce((sum, s) => sum + s.hitsPerMin, 0) / sorted.length;
  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;
  return {
    sessions: sorted.length,
    weeks,
    meanAccuracy,
    meanHitsPerMin,
    gainHitsPerMin: last.hitsPerMin - first.hitsPerMin,
  };
}

/** Compares personal gains between interleaved and blocked weeks (AC-6). */
export function compareDailyModes(sessions: readonly DailySessionRecord[]): DailyExperimentSummary {
  return {
    interleaved: summarizeMode(sessions.filter((s) => s.mode === "interleaved")),
    blocked: summarizeMode(sessions.filter((s) => s.mode === "blocked")),
  };
}
