import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import {
  COMPILE_GROUPS,
  COMPILE_GROUP_LABELS,
  causeById,
  type CauseId,
  type CompileGroup,
} from "../compile/causes";
import {
  COMPILE_DURATIONS_S,
  advanceAfterReview,
  compileRemainingMs,
  compileRoundEvents,
  compileRoundStats,
  isCompileRoundFinished,
  skipCompileItem,
  startCompileRound,
  submitCompileAnswer,
  tickCompileRound,
  touchCompileRound,
  type CompileRound,
} from "../compile/round";
import type { Clock } from "../core/clock";
import {
  appendCompileResult,
  loadCompileResults,
  loadCompileSettings,
  parseCompileSettings,
  saveCompileSettings,
  type CompileRoundResult,
  type CompileSettings,
} from "../storage/compile";
import { recordEvents } from "../storage/events";
import type { KeyValueStore } from "../storage/history";
import { matchTrainingKey } from "./keys";
import { RoundHistory } from "./shell/History";
import { PanelTitle, Reference, useRunning } from "./shell/panel";
import { Result } from "./shell/Result";
import { RoundBar } from "./shell/RoundBar";
import { isControl, isField } from "./shell/Shell";

const TICK_MS = 100;

export type CompileScreenProps = {
  readonly clock: Clock;
  readonly store: KeyValueStore;
  readonly newSeed: () => number;
  readonly onBack: () => void;
  readonly onRunning?: (running: boolean) => void;
};

type Run = {
  readonly settings: CompileSettings;
  readonly round: CompileRound;
  readonly run: number;
};

function newRun(settings: CompileSettings, seed: number, run: number): Run {
  return {
    settings,
    round: startCompileRound({
      durationMs: settings.durationS * 1000,
      seed,
      groups: settings.groups,
    }),
    run,
  };
}

const formatSec = (ms: number): string => `${(ms / 1000).toFixed(1)} s`;

/** Compiler & sanitizer output reading drill (T40 AC-4, ADR-T40-1). */
export function CompileScreen({
  clock,
  store,
  newSeed,
  onBack,
  onRunning,
}: CompileScreenProps): ReactNode {
  const [current, setCurrent] = useState<Run>(() =>
    newRun(loadCompileSettings(store), newSeed(), 0),
  );
  const [results, setResults] = useState<readonly CompileRoundResult[]>(() =>
    loadCompileResults(store),
  );
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [selectedCause, setSelectedCause] = useState<CauseId | null>(null);
  const [focusedLine, setFocusedLine] = useState(1);
  const [now, setNow] = useState(() => clock.now());

  const latest = useRef(current);
  const selectionRef = useRef({ selectedLine, selectedCause, focusedLine });
  useEffect(() => {
    selectionRef.current = { selectedLine, selectedCause, focusedLine };
  });

  const resetSelection = useCallback(() => {
    setSelectedLine(null);
    setSelectedCause(null);
    setFocusedLine(1);
    selectionRef.current = { selectedLine: null, selectedCause: null, focusedLine: 1 };
  }, []);

  const show = useCallback((next: Run) => {
    latest.current = next;
    setCurrent(next);
  }, []);

  const apply = useCallback(
    (round: CompileRound) => {
      const run = latest.current;
      if (round === run.round) return;
      if (!isCompileRoundFinished(run.round) && isCompileRoundFinished(round)) {
        const stats = compileRoundStats(round);
        const at = clock.wallTime();
        appendCompileResult(store, {
          version: 1,
          durationS: round.config.durationMs / 1000,
          seed: round.config.seed,
          correct: stats.correct,
          wrong: stats.wrong,
          skipped: stats.skipped,
          finishedAt: at,
        });
        recordEvents(store, compileRoundEvents(round, at), at);
        setResults(loadCompileResults(store));
      }
      show({ ...run, round });
    },
    [clock, show, store],
  );

  const { settings, round } = current;
  const finished = isCompileRoundFinished(round);
  const running = round.startedAt !== null && !finished;
  useRunning(onRunning, running);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const t = clock.now();
      setNow(t);
      apply(tickCompileRound(latest.current.round, t));
    }, TICK_MS);
    return () => {
      clearInterval(id);
    };
  }, [apply, clock, running]);

  const restart = useCallback(
    (nextSettings = latest.current.settings) => {
      resetSelection();
      setNow(clock.now());
      show(newRun(nextSettings, newSeed(), latest.current.run + 1));
    },
    [clock, newSeed, resetSelection, show],
  );

  const exit = useCallback(() => {
    const run = latest.current;
    resetSelection();
    show(newRun(run.settings, run.round.config.seed, run.run));
  }, [resetSelection, show]);

  const pickLine = useCallback(
    (lineNo: number) => {
      const cur = latest.current.round;
      const t = clock.now();
      setNow(t);
      const cause = selectionRef.current.selectedCause;
      if (cause !== null) {
        resetSelection();
        apply(submitCompileAnswer(cur, { line: lineNo, cause }, t));
      } else {
        setSelectedLine(lineNo);
        setFocusedLine(lineNo);
        selectionRef.current = {
          ...selectionRef.current,
          selectedLine: lineNo,
          focusedLine: lineNo,
        };
        apply(touchCompileRound(cur, t));
      }
    },
    [apply, clock, resetSelection],
  );

  const pickCause = useCallback(
    (cause: CauseId) => {
      const cur = latest.current.round;
      const t = clock.now();
      setNow(t);
      const line = selectionRef.current.selectedLine;
      if (line !== null) {
        resetSelection();
        apply(submitCompileAnswer(cur, { line, cause }, t));
      } else {
        setSelectedCause(cause);
        selectionRef.current = { ...selectionRef.current, selectedCause: cause };
        apply(touchCompileRound(cur, t));
      }
    },
    [apply, clock, resetSelection],
  );

  const continueAfterReview = useCallback(() => {
    const cur = latest.current.round;
    const t = clock.now();
    setNow(t);
    resetSelection();
    apply(advanceAfterReview(cur, t));
  }, [apply, clock, resetSelection]);

  const skipCurrent = useCallback(() => {
    const t = clock.now();
    setNow(t);
    resetSelection();
    apply(skipCompileItem(latest.current.round, t));
  }, [apply, clock, resetSelection]);

  const handleDrillKey = useCallback(
    (e: {
      key: string;
      ctrlKey: boolean;
      metaKey: boolean;
      altKey: boolean;
      shiftKey: boolean;
      target: EventTarget | null;
      preventDefault: () => void;
    }) => {
      const cur = latest.current.round;
      const action = matchTrainingKey(e);
      if (action === "skip") {
        e.preventDefault();
        skipCurrent();
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
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (cur.reviewing !== null) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          continueAfterReview();
        }
        return;
      }

      const lineCount = cur.current.caseData.code.split("\n").length;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = Math.min(lineCount, selectionRef.current.focusedLine + 1);
        setFocusedLine(next);
        selectionRef.current = { ...selectionRef.current, focusedLine: next };
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        const next = Math.max(1, selectionRef.current.focusedLine - 1);
        setFocusedLine(next);
        selectionRef.current = { ...selectionRef.current, focusedLine: next };
        return;
      }
      if (e.key === "Enter" && !isControl(e.target)) {
        e.preventDefault();
        pickLine(selectionRef.current.focusedLine);
        return;
      }
      if (/^[1-4]$/.test(e.key)) {
        e.preventDefault();
        const choice = cur.current.choices[Number(e.key) - 1];
        /* v8 ignore next */
        if (choice !== undefined) pickCause(choice.id);
      }
    },
    [continueAfterReview, exit, pickCause, pickLine, restart, skipCurrent],
  );

  // While a round is running (tree hidden), listen at window level so shortcuts 1-4 and Esc always work.
  useEffect(() => {
    if (!running) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || isField(e.target)) return;
      handleDrillKey(e);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [handleDrillKey, running]);

  // Enter on results starts a new round; Esc exits to options.
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
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [exit, finished, restart]);

  const change = (patch: Readonly<Record<string, unknown>>) => {
    const updated = parseCompileSettings({ ...latest.current.settings, ...patch });
    saveCompileSettings(store, updated);
    restart(updated);
  };

  const toggleGroup = (group: CompileGroup, on: boolean) => {
    change({
      groups: COMPILE_GROUPS.filter((g) =>
        g === group ? on : latest.current.settings.groups.includes(g),
      ),
    });
  };

  const historyScores = useMemo(
    () => results.filter((r) => r.durationS === settings.durationS).map((r) => r.correct),
    [results, settings.durationS],
  );

  const remainingS = Math.ceil(
    compileRemainingMs(round, Math.max(now, round.startedAt ?? now)) / 1000,
  );
  const correctCount = round.results.filter((r) => r.ok).length;
  const stats = useMemo(() => (finished ? compileRoundStats(round) : null), [finished, round]);
  const best = historyScores.length > 0 ? Math.max(...historyScores) : correctCount;

  const caseData = round.current.caseData;
  const codeLines = useMemo(() => caseData.code.split("\n"), [caseData.code]);
  const reviewing = round.reviewing;

  const stepPrompt =
    reviewing !== null
      ? "Veja a linha destacada e a explicação abaixo."
      : selectedLine !== null
        ? `Linha ${String(selectedLine)} selecionada — escolha a causa (1–4).`
        : selectedCause !== null
          ? "Causa selecionada — clique na linha do erro (ou setas + Enter)."
          : "Clique na linha do erro (ou setas + Enter) e escolha a causa (1–4).";

  const onAreaKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    handleDrillKey(e);
  };

  return (
    <div className="screen compile">
      <PanelTitle title="Ler o erro">
        Leia a saída real do g++, sanitizer ou juiz e aponte a linha e a causa em dois cliques.
      </PanelTitle>

      <div className="vim-options-block" data-panel="options">
        <div className="vim-options" role="group" aria-label="Opções">
          <label htmlFor="compile-duration">Duração</label>
          <select
            id="compile-duration"
            value={settings.durationS}
            onChange={(e) => {
              change({ durationS: Number(e.target.value) });
            }}
          >
            {COMPILE_DURATIONS_S.map((s) => (
              <option key={s} value={s}>
                {`${String(s)} s`}
              </option>
            ))}
          </select>
        </div>

        <details className="vim-kinds-details" data-testid="compile-groups-details">
          <summary>Grupos de erro</summary>
          <div className="vim-kinds compile-group-list">
            {COMPILE_GROUPS.map((group) => {
              const on = settings.groups.includes(group);
              const only = on && settings.groups.length === 1;
              return (
                <span key={group} className="vim-kind">
                  <label>
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={only}
                      onChange={(e) => {
                        toggleGroup(group, e.target.checked);
                      }}
                    />
                    {COMPILE_GROUP_LABELS[group]}
                  </label>
                </span>
              );
            })}
          </div>
        </details>
      </div>

      <div className="compile-area" data-panel="area" onKeyDown={onAreaKeyDown}>
        {finished && stats !== null ? (
          <Result
            headline={`${String(stats.correct)} ${stats.correct === 1 ? "acerto" : "acertos"} em ${String(settings.durationS)} s`}
            headlineTestId="compile-final-score"
            pairs={[
              { label: "erros", value: stats.wrong },
              { label: "puladas", value: stats.skipped },
              { label: "precisão", value: `${String(Math.round(stats.accuracy * 100))}%` },
              { label: "melhor", value: best },
            ]}
            extra={
              stats.byGroup.length > 0 ? (
                <table
                  className="progress-table compile-group-table"
                  data-testid="compile-group-table"
                  aria-label="Desempenho por grupo"
                >
                  <thead>
                    <tr>
                      <th>Grupo</th>
                      <th>Acertos</th>
                      <th>Tempo médio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.byGroup.map((row) => (
                      <tr key={row.group}>
                        <td data-label="Grupo">{COMPILE_GROUP_LABELS[row.group]}</td>
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
                <div className="compile-wrong-wrap" data-testid="compile-wrong-list">
                  <h3>Erros para revisar</h3>
                  <ul className="vim-worst">
                    {stats.wrongItems.map((item) => (
                      <li key={item.index}>
                        <strong>{COMPILE_GROUP_LABELS[item.group]}</strong>{" "}
                        <span className="muted">linha {item.expectedLine}:</span>{" "}
                        {causeById(item.expectedCause).label} — {item.explanation}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : undefined
            }
            seed={`seed ${String(round.config.seed)}`}
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
                  testId: "compile-time",
                  tone: remainingS <= 10 ? "warning" : "accent",
                },
                { label: "acertos", value: correctCount, testId: "compile-score" },
              ]}
            />

            <div className="compile-viewer">
              <div className="compile-file-bar">
                <span className="compile-group-badge" data-testid="compile-group">
                  {COMPILE_GROUP_LABELS[caseData.group]}
                </span>
                <code className="compile-flags" data-testid="compile-flags">
                  {`g++ ${caseData.flags.join(" ")} sol.cpp`}
                </code>
              </div>

              <div
                className="compile-code"
                data-testid="compile-code"
                data-autofocus="true"
                tabIndex={0}
                role="group"
                aria-label="Código C++ (clique ou use setas e Enter para escolher a linha)"
              >
                {codeLines.map((text, idx) => {
                  const lineNo = idx + 1;
                  const isCorrect = reviewing !== null && reviewing.expectedLine === lineNo;
                  const isWrong =
                    reviewing !== null &&
                    reviewing.selectedLine === lineNo &&
                    reviewing.expectedLine !== lineNo;
                  const isSelected = reviewing === null && selectedLine === lineNo;
                  const isFocused = reviewing === null && focusedLine === lineNo;
                  const cls = [
                    "compile-line",
                    isCorrect ? "compile-line-correct" : "",
                    isWrong ? "compile-line-wrong" : "",
                    isSelected ? "compile-line-selected" : "",
                    isFocused && !isSelected ? "compile-line-focused" : "",
                  ]
                    .filter(Boolean)
                    .join(" ");
                  return (
                    <button
                      key={lineNo}
                      type="button"
                      className={cls}
                      aria-label={`Linha ${String(lineNo)}`}
                      aria-pressed={isSelected}
                      disabled={reviewing !== null}
                      data-line={lineNo}
                      data-selected={isSelected ? "true" : undefined}
                      data-focused={isFocused ? "true" : undefined}
                      data-correct={isCorrect ? "true" : undefined}
                      data-wrong={isWrong ? "true" : undefined}
                      onClick={() => {
                        pickLine(lineNo);
                      }}
                    >
                      <span className="compile-gutter" aria-hidden="true">
                        {String(lineNo).padStart(2, " ")}
                      </span>
                      <span className="compile-line-text">{text}</span>
                    </button>
                  );
                })}
              </div>

              {caseData.input !== undefined && (
                <div className="compile-input-bar" data-testid="compile-input">
                  <span className="muted">entrada:</span> <code>{caseData.input.trim()}</code>
                </div>
              )}

              <pre className="compile-output" data-testid="compile-output">
                {caseData.output}
              </pre>
            </div>

            <p className="compile-step muted" data-testid="compile-step">
              {stepPrompt}
            </p>

            <div
              className="compile-choices"
              data-testid="compile-choices"
              role="group"
              aria-label="Causas"
            >
              {round.current.choices.map((choice, idx) => {
                const isCorrect = reviewing !== null && reviewing.expectedCause === choice.id;
                const isWrong =
                  reviewing !== null &&
                  reviewing.selectedCause === choice.id &&
                  reviewing.expectedCause !== choice.id;
                const isSelected = reviewing === null && selectedCause === choice.id;
                const cls = [
                  "compile-choice",
                  isCorrect ? "compile-choice-correct" : "",
                  isWrong ? "compile-choice-wrong" : "",
                  isSelected ? "compile-choice-selected" : "",
                ]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <button
                    key={choice.id}
                    type="button"
                    className={cls}
                    disabled={reviewing !== null}
                    aria-pressed={isSelected}
                    data-cause={choice.id}
                    data-shortcut={idx + 1}
                    data-correct={isCorrect ? "true" : undefined}
                    data-wrong={isWrong ? "true" : undefined}
                    onClick={() => {
                      pickCause(choice.id);
                    }}
                  >
                    <kbd>{idx + 1}</kbd> <span>{choice.label}</span>
                  </button>
                );
              })}
            </div>

            {reviewing !== null ? (
              <div
                className="compile-feedback compile-feedback-wrong"
                data-testid="compile-feedback"
                data-outcome="wrong"
              >
                <p>
                  <strong>
                    Linha {reviewing.expectedLine} — {causeById(reviewing.expectedCause).label}.
                  </strong>{" "}
                  {reviewing.explanation}
                </p>
                <button
                  type="button"
                  className="primary compile-next"
                  autoFocus
                  onClick={continueAfterReview}
                >
                  Próximo <kbd>Enter</kbd>
                </button>
              </div>
            ) : (
              round.last !== null && (
                <p
                  className={
                    round.last.ok
                      ? "compile-feedback compile-feedback-ok"
                      : "compile-feedback compile-feedback-skip"
                  }
                  data-testid="compile-feedback"
                  data-outcome={round.last.skipped ? "skipped" : "correct"}
                >
                  {round.last.ok ? (
                    <>
                      Correto: linha {round.last.expectedLine} —{" "}
                      {causeById(round.last.expectedCause).label}.
                    </>
                  ) : (
                    <>
                      Pulado. Linha {round.last.expectedLine} —{" "}
                      {causeById(round.last.expectedCause).label}: {round.last.explanation}
                    </>
                  )}
                </p>
              )
            )}
          </>
        )}
      </div>

      <RoundHistory scores={historyScores} unit="acertos" testId="compile-summary" />

      <Reference id="compile-flags" title="Como ler as saídas" className="vim-commands">
        <ul>
          <li>
            <code>-Wall -Wextra -Wshadow</code> — ativa avisos de sombra, formato no{" "}
            <code>printf</code>, variável não inicializada e comparação com sinal.
          </li>
          <li>
            <code>-g -fsanitize=address,undefined</code> — ASan mostra o tipo de erro, o frame em{" "}
            <code>sol.cpp:linha</code> e <code>SUMMARY</code>; UBSan aponta overflow, divisão por
            zero, shift inválido e ponteiro nulo.
          </li>
          <li>
            <code>-g -D_GLIBCXX_DEBUG</code> — checa índices e iteradores da STL em tempo de
            execução.
          </li>
          <li>
            <code>TLE / MLE / RTE</code> — <code>SIGSEGV</code> (memória inválida),{" "}
            <code>SIGFPE</code> (divisão/resto por zero) e <code>SIGABRT</code> (<code>assert</code>{" "}
            ou <code>bad_alloc</code>).
          </li>
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
