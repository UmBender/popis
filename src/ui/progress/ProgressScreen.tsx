import { useMemo, useState, type ReactNode } from "react";
import type { Clock } from "../../core/clock";
import { evaluateGoal, parseDay, type GoalLine } from "../../stats/learning";
import {
  computeProgress,
  formatSignedRate,
  seriesSummaryLine,
  type ConfigSeries,
  type DrillProgress,
} from "../../stats/progress";
import { compareDailyModes, recommendAll, type Recommendation } from "../../stats/recommend";
import { loadAdaptiveSettings } from "../../storage/adaptive";
import { loadAllEvents, loadEvents } from "../../storage/events";
import { loadGoals, removeGoal, saveGoal, type StoredGoals } from "../../storage/goals";
import { loadHistory } from "../../storage/history";
import type { KeyValueStore } from "../../storage/kv";
import { loadTextResults } from "../../storage/text-typing";
import { loadTypingResults } from "../../storage/typing";
import { loadVimEditResults, loadVimResults } from "../../storage/vim";
import { lessonForHelpKey } from "../../vim/curriculum";
import { seconds, skillLabel } from "../format";
import { Recommendations } from "../Recommendations";
import { PanelTitle } from "../shell/panel";
import { fullDate, ProgressChart } from "./ProgressChart";

export type ProgressScreenProps = {
  readonly store: KeyValueStore;
  readonly clock: Clock;
  readonly focusItem?: string | null;
  readonly onLearn?: (lessonId: string) => void;
};

const findVimLesson = (kc: string): string | undefined =>
  (lessonForHelpKey(kc) ?? lessonForHelpKey(`${kc}{c}`))?.id;

/** Progress dashboard ("Evolução"): curves, plateaus, KCs, typing stats, recommendations and goals (T23, T24). */
export function ProgressScreen({
  store,
  clock,
  focusItem,
  onLearn,
}: ProgressScreenProps): ReactNode {
  const now = clock.wallTime();
  const [goals, setGoals] = useState<StoredGoals>(() => loadGoals(store));

  const allEvents = useMemo(() => loadAllEvents(store), [store]);
  const drills = useMemo(
    () =>
      computeProgress(
        {
          sessions: loadHistory(store),
          typing: loadTypingResults(store),
          text: loadTextResults(store),
          vimMotion: loadVimResults(store),
          vimEdit: loadVimEditResults(store),
          events: loadEvents(store),
        },
        now,
      ),
    [store, now],
  );

  const recsByDrill = useMemo(
    () => recommendAll(drills, allEvents, now, findVimLesson, skillLabel),
    [drills, allEvents, now],
  );

  const experiment = useMemo(
    () => compareDailyModes(loadAdaptiveSettings(store).dailySessions),
    [store],
  );
  const hasExperiment = experiment.interleaved !== null || experiment.blocked !== null;

  const ordered = useMemo(() => {
    if (focusItem == null) return drills;
    const focused = drills.filter((d) => d.id === focusItem);
    const rest = drills.filter((d) => d.id !== focusItem);
    return [...focused, ...rest];
  }, [drills, focusItem]);

  const handleSaveGoal = (key: string, goal: GoalLine) => {
    saveGoal(store, key, goal);
    setGoals(loadGoals(store));
  };

  const handleRemoveGoal = (key: string) => {
    removeGoal(store, key);
    setGoals(loadGoals(store));
  };

  return (
    <div className="screen progress">
      <PanelTitle title="Evolução">
        Curvas de aprendizado, platôs, habilidades mais fracas e metas pessoais.
      </PanelTitle>

      <div data-panel="options">
        {hasExperiment && (
          <section className="progress-section" data-testid="daily-experiment">
            <h2>Experimento semanal: Intercalado vs. Em bloco</h2>
            <p className="muted">
              A evidência de intercalar em matemática é mista; compare o ganho real das suas
              próprias semanas no Treino do dia.
            </p>
            <table className="progress-table">
              <thead>
                <tr>
                  <th>Modo</th>
                  <th>Semanas</th>
                  <th>Sessões</th>
                  <th>Média (acertos/min)</th>
                  <th>Precisão média</th>
                  <th>Ganho</th>
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    ["Intercalado", experiment.interleaved],
                    ["Em bloco", experiment.blocked],
                  ] as const
                ).map(([label, stats]) => (
                  <tr key={label}>
                    <td data-label="Modo">{label}</td>
                    <td data-label="Semanas">{stats !== null ? stats.weeks : "—"}</td>
                    <td data-label="Sessões">{stats !== null ? stats.sessions : "—"}</td>
                    <td data-label="Média (acertos/min)">
                      {stats !== null ? stats.meanHitsPerMin.toFixed(1).replace(".", ",") : "—"}
                    </td>
                    <td data-label="Precisão média">
                      {stats !== null ? `${String(Math.round(stats.meanAccuracy * 100))}%` : "—"}
                    </td>
                    <td data-label="Ganho">
                      {stats !== null ? `${formatSignedRate(stats.gainHitsPerMin)}/min` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {ordered.length === 0 ? (
          <p className="muted" data-testid="progress-empty">
            Nenhuma rodada registrada ainda. Complete uma rodada em qualquer treino para acompanhar
            sua evolução.
          </p>
        ) : (
          <div className="progress-sections">
            {ordered.map((drill) => (
              <DrillSection
                key={drill.id}
                drill={drill}
                goals={goals}
                recommendations={recsByDrill[drill.id] ?? []}
                onSaveGoal={handleSaveGoal}
                onRemoveGoal={handleRemoveGoal}
                onLearn={onLearn}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DrillSection({
  drill,
  goals,
  recommendations,
  onSaveGoal,
  onRemoveGoal,
  onLearn,
}: {
  readonly drill: DrillProgress;
  readonly goals: StoredGoals;
  readonly recommendations: readonly Recommendation[];
  readonly onSaveGoal: (key: string, goal: GoalLine) => void;
  readonly onRemoveGoal: (key: string) => void;
  readonly onLearn?: (lessonId: string) => void;
}): ReactNode {
  const [configIdx, setConfigIdx] = useState(0);
  const active: ConfigSeries | undefined = drill.configs[configIdx] ?? drill.configs[0];
  const goal = active !== undefined ? (goals[active.key] ?? null) : null;
  const [targetText, setTargetText] = useState(() => (goal !== null ? String(goal.target) : ""));
  const [deadline, setDeadline] = useState(() => goal?.deadline ?? "");

  const latest = active?.rounds.at(-1);
  const goalStatus = goal !== null && latest !== undefined ? evaluateGoal(goal, latest) : null;

  const submitGoal = (e: React.FormEvent, series: ConfigSeries) => {
    e.preventDefault();
    const target = Number(targetText.replace(",", "."));
    if (!Number.isFinite(target) || target <= 0 || parseDay(deadline) === null) return;
    onSaveGoal(series.key, {
      target,
      deadline,
      setAt: (series.rounds[0] as { readonly at: number }).at,
      baseline: series.firstScore,
    });
  };

  return (
    <section
      className="progress-section"
      id={`progress-${drill.id}`}
      data-testid={`progress-section-${drill.id}`}
    >
      <div className="progress-section-head">
        <h2>{drill.label}</h2>
        {active?.plateau !== null && active?.plateau !== undefined && (
          <span className="progress-plateau" data-testid={`plateau-badge-${drill.id}`}>
            {`platô desde ${fullDate(active.plateau.since)}`}
          </span>
        )}
      </div>

      <Recommendations
        items={recommendations}
        testId={`progress-recommendations-${drill.id}`}
        onLearn={onLearn}
      />

      {drill.configs.length > 1 && (
        <div
          className="progress-configs"
          role="group"
          aria-label={`Configurações de ${drill.label}`}
        >
          {drill.configs.map((cfg, idx) => (
            <button
              key={cfg.key}
              type="button"
              className="progress-config-btn"
              aria-pressed={idx === configIdx}
              onClick={() => {
                setConfigIdx(idx);
                const nextGoal = goals[cfg.key] ?? null;
                setTargetText(nextGoal !== null ? String(nextGoal.target) : "");
                setDeadline(nextGoal?.deadline ?? "");
              }}
            >
              {`${cfg.label} (${String(cfg.rounds.length)})`}
            </button>
          ))}
        </div>
      )}

      {active !== undefined && (
        <>
          <p className="progress-headline" data-testid={`progress-headline-${drill.id}`}>
            {seriesSummaryLine(drill.label, active)}
            {active.fit !== null && (
              <span className="muted">{` · teto estimado ~${String(Math.round(active.fit.a))} ${active.unit}`}</span>
            )}
          </p>

          <ProgressChart
            title={`${drill.label} ${active.label}`}
            unit={active.unit}
            rounds={active.rounds}
            fit={active.fit}
            goal={goal}
          />

          <form
            className="progress-goal-form"
            onSubmit={(e) => {
              submitGoal(e, active);
            }}
          >
            <label>
              Meta (valor)
              <input
                type="number"
                step="any"
                min="1"
                value={targetText}
                onChange={(e) => {
                  setTargetText(e.target.value);
                }}
                placeholder={String(Math.round(active.lastScore * 1.2))}
              />
            </label>
            <label>
              Data da meta
              <input
                type="date"
                value={deadline}
                onChange={(e) => {
                  setDeadline(e.target.value);
                }}
              />
            </label>
            <button type="submit">Salvar meta</button>
            {goal !== null && (
              <button
                type="button"
                onClick={() => {
                  onRemoveGoal(active.key);
                  setTargetText("");
                  setDeadline("");
                }}
              >
                Remover meta
              </button>
            )}
          </form>

          {goalStatus !== null && (
            <p
              className={`progress-goal-status ${goalStatus.above ? "above" : "below"}`}
              data-testid={`goal-status-${drill.id}`}
            >
              {`${goalStatus.above ? "Acima" : "Abaixo"} da linha da meta (${goalStatus.delta >= 0 ? "+" : ""}${goalStatus.delta.toFixed(1).replace(".", ",")} ${active.unit})`}
            </p>
          )}
        </>
      )}

      {drill.kcs.length > 0 && (
        <div className="progress-block">
          <h3>Habilidades (mais fracas primeiro)</h3>
          <table className="progress-table">
            <thead>
              <tr>
                <th>Habilidade</th>
                <th>Acertos/min</th>
                <th>Precisão</th>
                <th>Mediana</th>
                <th>Regularidade (CV)</th>
                <th>Oportunidades</th>
              </tr>
            </thead>
            <tbody>
              {drill.kcs.map((kc) => (
                <tr key={kc.kc} data-testid={`kc-row-${drill.id}-${kc.kc}`}>
                  <td data-label="Habilidade">{skillLabel(kc.kc)}</td>
                  <td data-label="Acertos/min">{kc.hitsPerMin.toFixed(1).replace(".", ",")}</td>
                  <td data-label="Precisão">{`${String(Math.round(kc.accuracy * 100))}%`}</td>
                  <td data-label="Mediana">{seconds(kc.medianMs)}</td>
                  <td data-label="Regularidade (CV)">
                    {kc.stability !== null && kc.cv !== null
                      ? `${kc.stability} (${kc.cv.toFixed(2).replace(".", ",")})`
                      : "—"}
                  </td>
                  <td data-label="Oportunidades">{kc.opportunities}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {drill.bigrams.length > 0 && (
        <div className="progress-block">
          <h3>Pares de letras mais lentos</h3>
          <table className="progress-table">
            <thead>
              <tr>
                <th>Par</th>
                <th>Mediana</th>
                <th>Ocorrências</th>
              </tr>
            </thead>
            <tbody>
              {drill.bigrams.map((b) => (
                <tr key={b.bigram}>
                  <td data-label="Par">
                    <span>
                      <code>{b.bigram}</code>
                      {b.symbol && <span className="muted"> (símbolo)</span>}
                    </span>
                  </td>
                  <td data-label="Mediana">{`${String(Math.round(b.medianMs))} ms`}</td>
                  <td data-label="Ocorrências">{b.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {drill.charErrors.length > 0 && (
        <div className="progress-block">
          <h3>Caracteres com mais erro</h3>
          <table className="progress-table">
            <thead>
              <tr>
                <th>Caractere</th>
                <th>Taxa de erro</th>
                <th>Erros</th>
              </tr>
            </thead>
            <tbody>
              {drill.charErrors.map((c) => (
                <tr key={c.char}>
                  <td data-label="Caractere">
                    <span>
                      <code>{c.char}</code>
                      {c.symbol && <span className="muted"> (símbolo)</span>}
                    </span>
                  </td>
                  <td data-label="Taxa de erro">{`${String(Math.round(c.errorRate * 100))}%`}</td>
                  <td data-label="Erros">{`${String(c.errors)}/${String(c.total)}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
