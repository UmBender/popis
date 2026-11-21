import { useMemo, useState, type ReactNode } from "react";
import type { Clock } from "../core/clock";
import { MODES, type Mode } from "../modes";
import { startSession, type FinishedSession, type RunningSession } from "../session/engine";
import {
  arithmeticForLevel,
  estimationForLevel,
  replayElo,
  sumsForLevel,
  TARGET_ACCURACY_STEPS,
} from "../stats/elo";
import { buildDailyPlan, compareDailyModes, type DailyBlock } from "../stats/recommend";
import {
  appendDailySession,
  isoWeekOf,
  loadAdaptiveSettings,
  saveAdaptiveSettings,
  type AdaptiveSettings,
  type DailyMode,
} from "../storage/adaptive";
import { loadAllEvents } from "../storage/events";
import { loadHistory, loadSettings, type KeyValueStore } from "../storage/history";
import {
  dueReviewCards,
  recordSessionReview,
  syncReviewDeck,
  type CalcReviewCard,
} from "../storage/review";
import type { JsonValue } from "../core/problem";
import { skillLabel } from "./format";
import { GameScreen } from "./GameScreen";
import { PanelTitle } from "./shell/panel";
import type { ItemId } from "./shell/sections";

export type DailyScreenProps = {
  readonly store: KeyValueStore;
  readonly clock: Clock;
  readonly newSeed: () => number;
  readonly onChooseItem: (id: ItemId, level?: number) => void;
  readonly onRunning?: (running: boolean) => void;
};

type ActiveRun = {
  readonly blockIndex: number;
  readonly session: RunningSession<JsonValue>;
  readonly mode: Mode;
  readonly completedCorrect: number;
  readonly completedTotal: number;
  readonly totalDurationMs: number;
};

function paramsForBlock(
  block: DailyBlock,
  store: KeyValueStore,
  dueCalc: readonly CalcReviewCard[],
): { readonly mode: Mode; readonly params: JsonValue } | null {
  const settings = loadSettings(store);
  if (block.drill === "review") {
    if (dueCalc.length === 0) return null;
    return { mode: "review", params: { items: dueCalc.map((c) => c.item) } };
  }
  if (block.drill === "vim-motion" || block.drill === "vim-edit") return null;
  if (block.drill === "arithmetic" && block.level !== null) {
    return { mode: "arithmetic", params: arithmeticForLevel(block.level, settings.arithmetic) };
  }
  if (block.drill === "estimation" && block.level !== null) {
    return { mode: "estimation", params: estimationForLevel(block.level) };
  }
  if (block.drill === "sums" && block.level !== null) {
    return { mode: "sums", params: sumsForLevel(block.level) };
  }
  return { mode: block.drill, params: settings[block.drill] };
}

/** Guided 5–10 min daily workout interleaving FSRS due cards and weakest KCs (AC-4, AC-6). */
export function DailyScreen({
  store,
  clock,
  newSeed,
  onChooseItem,
  onRunning,
}: DailyScreenProps): ReactNode {
  const now = clock.wallTime();
  const [adaptive, setAdaptive] = useState<AdaptiveSettings>(() => loadAdaptiveSettings(store));
  const [active, setActive] = useState<ActiveRun | null>(null);
  const [doneMessage, setDoneMessage] = useState<string | null>(null);

  const history = useMemo(
    () => (active === null ? loadHistory(store) : loadHistory(store)),
    [store, active],
  );
  const events = useMemo(
    () => (active === null ? loadAllEvents(store) : loadAllEvents(store)),
    [store, active],
  );
  const deck = useMemo(() => syncReviewDeck(store, history, now), [store, history, now]);
  const dueCards = useMemo(() => dueReviewCards(deck, now), [deck, now]);
  const dueCalc = useMemo(
    () => dueCards.filter((c): c is CalcReviewCard => c.kind === "calc"),
    [dueCards],
  );
  const elo = useMemo(() => replayElo(events, now), [events, now]);

  const plan = useMemo(
    () =>
      buildDailyPlan({
        dueCards,
        events,
        elo,
        mode: adaptive.dailyMode,
        targetAccuracy: adaptive.targetAccuracy,
        labelOfKc: skillLabel,
      }),
    [dueCards, events, elo, adaptive.dailyMode, adaptive.targetAccuracy],
  );

  const experiment = useMemo(
    () => compareDailyModes(adaptive.dailySessions),
    [adaptive.dailySessions],
  );

  const updateAdaptive = (patch: Partial<AdaptiveSettings>) => {
    const next: AdaptiveSettings = { ...adaptive, ...patch };
    saveAdaptiveSettings(store, next);
    setAdaptive(next);
  };

  const startBlockAt = (
    idx: number,
    completedCorrect: number,
    completedTotal: number,
    totalDurationMs: number,
  ) => {
    for (let i = idx; i < plan.blocks.length; i++) {
      const block = plan.blocks[i]!;
      const resolved = paramsForBlock(block, store, dueCalc);
      if (resolved === null) continue;
      const session = startSession(
        {
          generator: MODES[resolved.mode].generator,
          params: resolved.params,
          durationMs: block.durationS * 1000,
          seed: newSeed(),
        },
        clock.now(),
      );
      setDoneMessage(null);
      onRunning?.(true);
      setActive({
        blockIndex: i,
        session,
        mode: resolved.mode,
        completedCorrect,
        completedTotal,
        totalDurationMs,
      });
      return;
    }

    onRunning?.(false);
    setActive(null);
    if (completedTotal > 0) {
      const minutes = Math.max(0.5, totalDurationMs / 60_000);
      const updated = appendDailySession(store, {
        finishedAt: clock.wallTime(),
        week: isoWeekOf(clock.wallTime()),
        mode: adaptive.dailyMode,
        accuracy: completedCorrect / completedTotal,
        hitsPerMin: completedCorrect / minutes,
        itemsCompleted: completedTotal,
      });
      setAdaptive(updated);
      setDoneMessage(
        `Treino do dia concluído (${String(completedCorrect)}/${String(completedTotal)} acertos).`,
      );
    }
  };

  const handleBlockFinish = (run: ActiveRun, finished: FinishedSession<JsonValue>) => {
    const at = clock.wallTime();
    recordSessionReview(
      store,
      {
        version: 1,
        mode: run.mode,
        finishedAt: at,
        durationMs: finished.config.durationMs,
        seed: finished.config.seed,
        params: finished.config.params,
        log: finished.log,
      },
      loadAllEvents(store),
      at,
    );
    const answered = finished.log.filter((a) => a.outcome !== "timeout");
    const correct = answered.filter((a) => a.outcome === "correct").length;
    startBlockAt(
      run.blockIndex + 1,
      run.completedCorrect + correct,
      run.completedTotal + answered.length,
      run.totalDurationMs + finished.config.durationMs,
    );
  };

  const abortRun = () => {
    onRunning?.(false);
    setActive(null);
  };

  return (
    <div className="screen daily">
      <PanelTitle title="Treino do dia">
        {`Sessão estimada de ${String(plan.estimatedMinutes)} min combinando cartões vencidos do Revisar e suas habilidades mais fracas.`}
      </PanelTitle>

      <div className="fields" data-panel="options">
        <label className="row">
          Modo da semana
          <select
            aria-label="Modo da semana"
            value={adaptive.dailyMode}
            onChange={(e) => {
              updateAdaptive({
                dailyMode: e.target.value as DailyMode,
                dailyModeWeek: isoWeekOf(clock.wallTime()),
              });
            }}
          >
            <option value="interleaved">Intercalado</option>
            <option value="blocked">Em bloco</option>
          </select>
        </label>

        <label className="row">
          Meta de acerto
          <select
            aria-label="Meta de acerto"
            value={String(adaptive.targetAccuracy)}
            onChange={(e) => {
              updateAdaptive({ targetAccuracy: Number(e.target.value) });
            }}
          >
            {TARGET_ACCURACY_STEPS.map((step) => (
              <option key={step} value={String(step)}>
                {`${String(Math.round(step * 100))}%`}
              </option>
            ))}
          </select>
        </label>

        <ol className="daily-blocks" data-testid="daily-blocks">
          {plan.blocks.map((block) => (
            <li key={block.id} className="daily-block">
              <div className="daily-block-head">
                <strong>{block.title}</strong>
                <span className="muted">
                  {block.level !== null
                    ? `Nível ${String(block.level)} · ${String(Math.round(block.durationS / 60))} min`
                    : `${String(Math.round(block.durationS / 60))} min`}
                </span>
              </div>
              <p className="daily-block-reason muted" data-testid="daily-block-reason">
                {block.reason}
              </p>
              <button
                type="button"
                className="history-link"
                onClick={() => {
                  onChooseItem(block.drill, block.level ?? undefined);
                }}
              >
                Abrir treino
              </button>
            </li>
          ))}
        </ol>
      </div>

      <div data-panel="area">
        {active !== null ? (
          <div className="daily-runner">
            <p className="muted" data-testid="daily-progress">
              {`Bloco ${String(active.blockIndex + 1)} de ${String(plan.blocks.length)}: ${plan.blocks[active.blockIndex]?.title ?? ""}`}
            </p>
            <GameScreen
              key={`${String(active.blockIndex)}-${String(active.session.config.seed)}`}
              initial={active.session}
              clock={clock}
              mode={active.mode}
              onFinish={(finished) => {
                handleBlockFinish(active, finished);
              }}
              onAbort={abortRun}
              onRestart={() => {
                startBlockAt(
                  active.blockIndex,
                  active.completedCorrect,
                  active.completedTotal,
                  active.totalDurationMs,
                );
              }}
            />
          </div>
        ) : (
          <div className="actions">
            <button
              type="button"
              className="primary start"
              onClick={() => {
                startBlockAt(0, 0, 0, 0);
              }}
            >
              Começar treino do dia
            </button>
            {doneMessage !== null && (
              <p className="muted" data-testid="daily-done">
                {doneMessage}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="history muted" data-panel="history">
        {adaptive.dailySessions.length === 0 ? (
          <span>
            Nenhuma sessão do Treino do dia registrada ainda. Alterne entre Intercalado e Em bloco
            por semana para medir qual funciona melhor para você.
          </span>
        ) : (
          <span>
            {`${String(adaptive.dailySessions.length)} ${adaptive.dailySessions.length === 1 ? "sessão concluída" : "sessões concluídas"}`}
            {experiment.interleaved !== null
              ? ` · Intercalado: ${experiment.interleaved.meanHitsPerMin.toFixed(1).replace(".", ",")} acertos/min`
              : ""}
            {experiment.blocked !== null
              ? ` · Em bloco: ${experiment.blocked.meanHitsPerMin.toFixed(1).replace(".", ",")} acertos/min`
              : ""}
          </span>
        )}
      </div>
    </div>
  );
}
