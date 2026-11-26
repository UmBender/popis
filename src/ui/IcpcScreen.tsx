import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Clock } from "../core/clock";
import {
  ICPC_KIND_LABELS,
  ICPC_KINDS,
  type IcpcItem,
  type IcpcKind,
  type IcpcKindFilter,
} from "../icpc/drill";
import {
  ICPC_DURATIONS_S,
  icpcRemainingMs,
  icpcRoundEvents,
  icpcRoundStats,
  isIcpcRoundFinished,
  skipIcpcItem,
  startIcpcRound,
  submitIcpcAnswer,
  tickIcpcRound,
  touchIcpcRound,
  type IcpcRound,
} from "../icpc/round";
import type { ProblemCell, Submission, TeamStanding, Verdict } from "../icpc/score";
import { recordEvents } from "../storage/events";
import type { KeyValueStore } from "../storage/history";
import {
  appendIcpcResult,
  loadIcpcResults,
  loadIcpcSettings,
  parseIcpcSettings,
  saveIcpcSettings,
  type IcpcResult,
  type IcpcSettings,
} from "../storage/icpc";
import { matchTrainingKey } from "./keys";
import { RoundHistory } from "./shell/History";
import { PanelTitle, Reference, useRunning } from "./shell/panel";
import { Result } from "./shell/Result";
import { RoundBar } from "./shell/RoundBar";

const TICK_MS = 100;

const ICPC_RULES: readonly (readonly [string, string])[] = [
  ["Problemas resolvidos", "primeiro critério de classificação (quem resolveu mais fica na frente)"],
  ["Penalidade", "soma de (minuto do 1º AC + 20 × rejeições antes do AC) só nos problemas com AC"],
  ["Não resolvido", "rejeições em problema sem AC nunca somam penalidade"],
  ["Após o AC", "submissões depois do primeiro AC no mesmo problema são ignoradas"],
  ["CE (Compile Error)", "não gera penalidade na regra da WF / Maratona SBC (ativável nas opções)"],
  ["Desempate", "mesmo nº de ACs e mesma penalidade: vence quem teve o último AC mais cedo"],
  ["Escolher problema", "compare AC / tentativas, não só a contagem bruta de ACs"],
];

const PLACEHOLDERS: Readonly<Record<IcpcKind, string>> = {
  penalidade: "ex.: 185",
  posicao: "ex.: 2",
  ultrapassar: "ex.: 164",
  escolher: "ex.: B",
};

export type IcpcScreenProps = {
  readonly clock: Clock;
  readonly store: KeyValueStore;
  readonly newSeed: () => number;
  readonly onBack: () => void;
  readonly onRunning?: (running: boolean) => void;
};

type Run = {
  readonly settings: IcpcSettings;
  readonly round: IcpcRound;
  readonly run: number;
};

function newRun(settings: IcpcSettings, seed: number, run: number): Run {
  return {
    settings,
    round: startIcpcRound({
      durationMs: settings.durationS * 1000,
      seed,
      kind: settings.kind,
      compileErrorCounts: settings.compileErrorCounts,
    }),
    run,
  };
}

const formatSec = (ms: number): string => `${(ms / 1000).toFixed(1)} s`;

function Balloon({ problem }: { readonly problem: string }): ReactNode {
  return (
    <svg
      className={`icpc-balloon icpc-balloon-${problem}`}
      data-problem={problem}
      viewBox="0 0 16 20"
      aria-hidden="true"
    >
      <ellipse cx="8" cy="7.5" rx="6" ry="6.5" fill="currentColor" stroke="var(--text)" strokeWidth="0.8" />
      <polygon points="6.5,13.8 9.5,13.8 8,15.8" fill="currentColor" />
      <path d="M8 15.8 C7 17.3, 9 18.4, 8 19.8" fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

function verdictClass(verdict: Verdict): string {
  if (verdict === "AC") return "icpc-verdict icpc-verdict-ac";
  if (verdict === "CE") return "icpc-verdict icpc-verdict-ce";
  return "icpc-verdict icpc-verdict-rej";
}

function ProblemCellView({
  cell,
  highlight,
}: {
  readonly cell: ProblemCell;
  readonly highlight?: boolean;
}): ReactNode {
  const cls = highlight === true ? "icpc-cell-target" : undefined;
  if (cell.solved && cell.acMinute !== null) {
    return (
      <td className={cls === undefined ? "icpc-cell-ac" : `icpc-cell-ac ${cls}`}>
        <span className="icpc-cell-ac-inner">
          <Balloon problem={cell.problem} />
          <span>{`${String(cell.attempts)}/${String(cell.acMinute)}`}</span>
        </span>
      </td>
    );
  }
  if (cell.rejected > 0) {
    return (
      <td className={cls === undefined ? "icpc-cell-rej" : `icpc-cell-rej ${cls}`}>
        {`-${String(cell.rejected)}`}
      </td>
    );
  }
  return <td className={cls === undefined ? "icpc-cell-empty" : `icpc-cell-empty ${cls}`}>·</td>;
}

function ScoreboardTable({
  rows,
  problems,
  focusTeam,
  rivalTeam,
  targetProblem,
  hidePenalty,
}: {
  readonly rows: readonly TeamStanding[];
  readonly problems: readonly string[];
  readonly focusTeam?: string;
  readonly rivalTeam?: string;
  readonly targetProblem?: string;
  readonly hidePenalty?: boolean;
}): ReactNode {
  return (
    <div className="icpc-board-wrap">
      <table className="icpc-table" aria-label="Placar ICPC">
        <thead>
          <tr>
            <th>#</th>
            <th className="icpc-col-team">Time</th>
            <th>AC</th>
            <th>Pen.</th>
            {problems.map((p) => (
              <th key={p}>
                <span className="icpc-prob-head">
                  <Balloon problem={p} />
                  <span>{p}</span>
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isFocus = row.team === focusTeam;
            const isRival = row.team === rivalTeam;
            const rowClass = isFocus
              ? "icpc-row-focus"
              : isRival
                ? "icpc-row-rival"
                : undefined;
            return (
              <tr key={row.team} className={rowClass}>
                <td>{hidePenalty === true ? "—" : `${String(row.rank)}º`}</td>
                <td className="icpc-col-team">
                  {row.team}
                  {isFocus && rivalTeam !== undefined && <span className="icpc-tag">seu time</span>}
                  {isRival && <span className="icpc-tag icpc-tag-rival">alvo</span>}
                </td>
                <td>{row.solved}</td>
                <td>{hidePenalty === true ? "?" : row.penalty}</td>
                {problems.map((p) => (
                  <ProblemCellView
                    key={p}
                    cell={row.problems[p]!}
                    highlight={isFocus && p === targetProblem}
                  />
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SubmissionLogView({
  problems,
  submissions,
}: {
  readonly problems: readonly string[];
  readonly submissions: readonly Submission[];
}): ReactNode {
  return (
    <div className="icpc-sub-log" data-testid="icpc-sub-log">
      {problems.map((p) => {
        const runs = submissions.filter((s) => s.problem === p);
        if (runs.length === 0) return null;
        return (
          <div key={p} className="icpc-prob-log">
            <div className="icpc-prob-log-head">
              <Balloon problem={p} />
              <span>{`Problema ${p}`}</span>
            </div>
            <div className="icpc-prob-log-runs">
              {runs.map((run, idx) => (
                <span key={idx} className={`icpc-run-chip ${verdictClass(run.verdict)}`}>
                  {`${String(run.minute)}' ${run.verdict}`}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BoardView({ item }: { readonly item: IcpcItem }): ReactNode {
  const ruleLabel = item.compileErrorCounts ? "CE +20 min" : "CE sem penalidade (WF)";
  const headerText = `${ICPC_KIND_LABELS[item.kind]} · ${String(item.currentMinute)} min · ${ruleLabel}`;

  switch (item.kind) {
    case "penalidade":
      return (
        <div className="icpc-board-card" data-testid="icpc-board">
          <div className="icpc-board-head">
            <span>{headerText}</span>
            <span>formato: tentativas/min</span>
          </div>
          <ScoreboardTable
            rows={[item.standing]}
            problems={item.problems}
            focusTeam={item.team}
            hidePenalty
          />
          <SubmissionLogView problems={item.problems} submissions={item.submissions} />
        </div>
      );

    case "posicao":
      return (
        <div className="icpc-board-card" data-testid="icpc-board">
          <div className="icpc-board-head">
            <span>{headerText}</span>
            <span>formato: tentativas/min</span>
          </div>
          <ScoreboardTable
            rows={item.before}
            problems={item.problems}
            focusTeam={item.newSubmission.team}
            targetProblem={item.newSubmission.problem}
          />
          <div className="icpc-sub-banner" data-testid="icpc-new-submission">
            <strong>Nova submissão:</strong>
            <span>{`min ${String(item.newSubmission.minute)}`}</span>
            <span>{item.newSubmission.team}</span>
            <span className="icpc-prob-head">
              <Balloon problem={item.newSubmission.problem} />
              <span>{`Problema ${item.newSubmission.problem}`}</span>
            </span>
            <span className={verdictClass(item.newSubmission.verdict)}>
              {item.newSubmission.verdict}
            </span>
          </div>
        </div>
      );

    case "ultrapassar":
      return (
        <div className="icpc-board-card" data-testid="icpc-board">
          <div className="icpc-board-head">
            <span>{headerText}</span>
            <span>{`alvo: ${item.targetProblem}`}</span>
          </div>
          <ScoreboardTable
            rows={item.board}
            problems={item.problems}
            focusTeam={item.chaser}
            rivalTeam={item.rival}
            targetProblem={item.targetProblem}
          />
        </div>
      );

    case "escolher":
      return (
        <div className="icpc-board-card" data-testid="icpc-board">
          <div className="icpc-board-head">
            <span>{headerText}</span>
            <span>AC / tentativas por problema</span>
          </div>
          <div className="icpc-choose-grid">
            {item.problemStats.map((stat) => (
              <div key={stat.problem} className="icpc-choose-card">
                <div className="icpc-choose-head">
                  <Balloon problem={stat.problem} />
                  <span>{stat.problem}</span>
                </div>
                <span className="icpc-choose-ac">{`${String(stat.ac)} AC`}</span>
                <span className="icpc-choose-att">{`${String(stat.attempts)} tent.`}</span>
              </div>
            ))}
          </div>
        </div>
      );
  }
}

/** ICPC / Maratona SBC scoreboard and penalty drill screen (T43 AC-3, ADR-T43-1). */
export function IcpcScreen({
  clock,
  store,
  newSeed,
  onBack,
  onRunning,
}: IcpcScreenProps): ReactNode {
  const [current, setCurrent] = useState<Run>(() => newRun(loadIcpcSettings(store), newSeed(), 0));
  const [results, setResults] = useState<readonly IcpcResult[]>(() => loadIcpcResults(store));
  const [text, setText] = useState("");
  const [now, setNow] = useState(() => clock.now());
  const latest = useRef(current);
  const inputRef = useRef<HTMLInputElement>(null);

  const show = useCallback((next: Run) => {
    latest.current = next;
    setCurrent(next);
  }, []);

  const apply = useCallback(
    (round: IcpcRound) => {
      const run = latest.current;
      if (round === run.round) return;
      if (!isIcpcRoundFinished(run.round) && isIcpcRoundFinished(round)) {
        const stats = icpcRoundStats(round);
        const at = clock.wallTime();
        appendIcpcResult(store, {
          version: 1,
          durationS: round.config.durationMs / 1000,
          kind: round.config.kind,
          compileErrorCounts: round.config.compileErrorCounts,
          seed: round.config.seed,
          correct: stats.correct,
          wrong: stats.wrong,
          skipped: stats.skipped,
          finishedAt: at,
        });
        recordEvents(store, icpcRoundEvents(round, at), at);
        setResults(loadIcpcResults(store));
      }
      show({ ...run, round });
    },
    [clock, show, store],
  );

  const { settings, round } = current;
  const finished = isIcpcRoundFinished(round);
  const running = round.startedAt !== null && !finished;
  useRunning(onRunning, running);

  useEffect(() => {
    if (!finished) inputRef.current?.focus();
  }, [current.run, finished]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const t = clock.now();
      setNow(t);
      apply(tickIcpcRound(latest.current.round, t));
    }, TICK_MS);
    return () => {
      clearInterval(id);
    };
  }, [apply, clock, running]);

  const restart = useCallback(
    (nextSettings = latest.current.settings) => {
      setText("");
      setNow(clock.now());
      show(newRun(nextSettings, newSeed(), latest.current.run + 1));
    },
    [clock, newSeed, show],
  );

  const exit = useCallback(() => {
    const run = latest.current;
    setText("");
    show(newRun(run.settings, run.round.config.seed, run.run));
    inputRef.current?.blur();
  }, [show]);

  useEffect(() => {
    if (!finished) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        restart();
      } else if (e.key === "Escape") {
        e.preventDefault();
        exit();
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [exit, finished, restart]);

  const change = (patch: Readonly<Record<string, unknown>>) => {
    const updated = parseIcpcSettings({ ...latest.current.settings, ...patch });
    saveIcpcSettings(store, updated);
    restart(updated);
  };

  const submitCurrent = () => {
    const trimmed = text.trim();
    if (trimmed.length === 0) return;
    const t = clock.now();
    setNow(t);
    setText("");
    apply(submitIcpcAnswer(latest.current.round, trimmed, t));
  };

  const historyScores = useMemo(
    () =>
      results
        .filter(
          (r) =>
            r.durationS === settings.durationS &&
            r.kind === settings.kind &&
            r.compileErrorCounts === settings.compileErrorCounts,
        )
        .map((r) => r.correct),
    [results, settings.durationS, settings.kind, settings.compileErrorCounts],
  );

  const remainingS = Math.ceil(icpcRemainingMs(round, Math.max(now, round.startedAt ?? now)) / 1000);
  const correctCount = round.results.filter((r) => r.ok).length;
  const stats = useMemo(() => (finished ? icpcRoundStats(round) : null), [finished, round]);
  const best = historyScores.length > 0 ? Math.max(...historyScores) : correctCount;

  const numeric = round.current.kind !== "escolher";
  const kindLabel =
    settings.kind === "all" ? "todos" : ICPC_KIND_LABELS[settings.kind].toLowerCase();

  return (
    <div className="screen icpc">
      <PanelTitle title="Placar">
        Calcule penalidade, nova posição, minuto limite para ultrapassar e qual problema atacar nas
        regras do ICPC e da Maratona SBC.
      </PanelTitle>

      <div className="vim-options-block" data-panel="options">
        <div className="vim-options" role="group" aria-label="Opções">
          <label htmlFor="icpc-duration">Duração</label>
          <select
            id="icpc-duration"
            value={settings.durationS}
            onChange={(e) => {
              change({ durationS: Number(e.target.value) });
            }}
          >
            {ICPC_DURATIONS_S.map((s) => (
              <option key={s} value={s}>
                {`${String(s)} s`}
              </option>
            ))}
          </select>

          <label htmlFor="icpc-kind">Tipo</label>
          <select
            id="icpc-kind"
            value={settings.kind}
            onChange={(e) => {
              change({ kind: e.target.value as IcpcKindFilter });
            }}
          >
            <option value="all">Todos</option>
            {ICPC_KINDS.map((k) => (
              <option key={k} value={k}>
                {ICPC_KIND_LABELS[k]}
              </option>
            ))}
          </select>

          <label className="icpc-ce-toggle">
            <input
              type="checkbox"
              checked={settings.compileErrorCounts}
              onChange={(e) => {
                change({ compileErrorCounts: e.target.checked });
              }}
            />
            <span>CE conta penalidade</span>
          </label>
        </div>
      </div>

      <div className="gdb-area" data-panel="area">
        {finished && stats !== null ? (
          <Result
            headline={`${String(stats.correct)} ${stats.correct === 1 ? "acerto" : "acertos"} em ${String(settings.durationS)} s`}
            headlineTestId="icpc-final-score"
            pairs={[
              { label: "erros", value: stats.wrong },
              { label: "puladas", value: stats.skipped },
              { label: "precisão", value: `${String(Math.round(stats.accuracy * 100))}%` },
              { label: "melhor", value: best },
            ]}
            extra={
              stats.byKind.length > 0 ? (
                <table
                  className="progress-table gdb-kind-table"
                  data-testid="icpc-kind-table"
                  aria-label="Desempenho por tipo"
                >
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>Acertos</th>
                      <th>Tempo médio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.byKind.map((row) => (
                      <tr key={row.kind}>
                        <td data-label="Tipo">{ICPC_KIND_LABELS[row.kind]}</td>
                        <td data-label="Acertos">{`${String(row.correct)}/${String(row.total)}`}</td>
                        <td data-label="Tempo médio">{formatSec(row.avgTimeMs)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : undefined
            }
            worst={
              stats.wrongItems.length > 0 ? (
                <div className="gdb-wrong-wrap" data-testid="icpc-wrong-list">
                  <h3>Questões erradas</h3>
                  <ul className="vim-worst">
                    {stats.wrongItems.map((item) => (
                      <li key={item.index}>
                        <strong>{ICPC_KIND_LABELS[item.kind]}</strong>{" "}
                        <span className="muted">você:</span> <code>{item.typed}</code>{" "}
                        <span className="muted">certo:</span> <code>{item.canonical}</code> —{" "}
                        {item.explanation}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : undefined
            }
            seed={`seed ${String(round.config.seed)} · ${kindLabel}${settings.compileErrorCounts ? " · CE+20" : ""}`}
            onPlayAgain={() => {
              restart();
            }}
          />
        ) : (
          <>
            <RoundBar
              metrics={[
                {
                  label: "tempo",
                  value: `${String(remainingS)} s`,
                  testId: "icpc-time",
                  tone: remainingS <= 10 ? "warning" : "accent",
                },
                { label: "acertos", value: correctCount, testId: "icpc-score" },
              ]}
            />

            <p className="gdb-prompt" data-testid="icpc-prompt">
              {round.current.prompt}
            </p>

            <BoardView item={round.current} />

            <form
              className="gdb-input-row"
              onSubmit={(e) => {
                e.preventDefault();
                submitCurrent();
              }}
            >
              <span className="gdb-prompt-prefix" aria-hidden="true">
                &gt;
              </span>
              <input
                ref={inputRef}
                type="text"
                inputMode={numeric ? "numeric" : "text"}
                className="gdb-input"
                aria-label="Resposta"
                placeholder={PLACEHOLDERS[round.current.kind]}
                value={text}
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="send"
                onChange={(e) => {
                  const val = e.target.value;
                  setText(val);
                  if (val.length > 0 && latest.current.round.startedAt === null) {
                    const t = clock.now();
                    setNow(t);
                    apply(touchIcpcRound(latest.current.round, t));
                  }
                }}
                onKeyDown={(e) => {
                  const action = matchTrainingKey(e);
                  if (action === "skip") {
                    e.preventDefault();
                    const t = clock.now();
                    setNow(t);
                    setText("");
                    apply(skipIcpcItem(latest.current.round, t));
                    return;
                  }
                  if (action === "restart") {
                    e.preventDefault();
                    restart();
                    return;
                  }
                  if (action === "exit") {
                    e.preventDefault();
                    exit();
                    return;
                  }
                  if (e.key === "Enter" && !e.ctrlKey && !e.metaKey && !e.altKey) {
                    e.preventDefault();
                    submitCurrent();
                  }
                }}
              />
              <button type="submit" className="primary gdb-send">
                Enviar
              </button>
            </form>

            {round.last !== null && (
              <p
                className={
                  round.last.ok
                    ? "gdb-feedback gdb-feedback-ok"
                    : round.last.skipped
                      ? "gdb-feedback gdb-feedback-skip"
                      : "gdb-feedback gdb-feedback-wrong"
                }
                data-testid="icpc-feedback"
                data-outcome={round.last.skipped ? "skipped" : round.last.ok ? "correct" : "wrong"}
              >
                {round.last.ok ? (
                  <>
                    Correto: <code>{round.last.canonical}</code> — {round.last.explanation}
                  </>
                ) : round.last.skipped ? (
                  <>
                    Pulado. Resposta: <code>{round.last.canonical}</code> — {round.last.explanation}
                  </>
                ) : (
                  <>
                    Resposta certa: <code>{round.last.canonical}</code> — {round.last.explanation}
                  </>
                )}
              </p>
            )}
          </>
        )}
      </div>

      <RoundHistory scores={historyScores} unit="acertos" testId="icpc-summary" />

      <Reference id="icpc-rules" title="Regras do placar ICPC / SBC" className="vim-commands">
        <ul>
          {ICPC_RULES.map(([topic, desc]) => (
            <li key={topic}>
              <strong>{topic}</strong> — {desc}
            </li>
          ))}
        </ul>
      </Reference>

      <div className="actions">
        <button type="button" onClick={onBack}>
          Voltar
        </button>
      </div>
    </div>
  );
}
