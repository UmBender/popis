import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import type { Clock } from "../core/clock";
import { recordEvents } from "../storage/events";
import type { KeyValueStore } from "../storage/history";
import {
  appendWaResult,
  loadWaResults,
  loadWaSettings,
  parseWaSettings,
  saveWaSettings,
  type WaRoundResult,
  type WaSettings,
} from "../storage/wa";
import { WA_JUDGE_FLAGS } from "../wa/cases";
import { WA_CLASSES, WA_CLASS_LABELS, waClassLabel, type WaClass } from "../wa/classes";
import { diffSnippet } from "../wa/diff";
import {
  advanceAfterReview,
  isWaRoundFinished,
  skipWaItem,
  startWaRound,
  submitWaAnswer,
  touchWaRound,
  waElapsedMs,
  waRoundEvents,
  waRoundStats,
  type WaRound,
} from "../wa/round";
import { matchTrainingKey } from "./keys";
import { ChoiceGrid, CodeLinePicker } from "./maratona/LineChoicePicker";
import { RoundHistory } from "./shell/History";
import { PanelTitle, Reference, useRunning } from "./shell/panel";
import { Result } from "./shell/Result";
import { RoundBar } from "./shell/RoundBar";
import { isControl, isField } from "./shell/Shell";

const TICK_MS = 100;

export type WaScreenProps = {
  readonly clock: Clock;
  readonly store: KeyValueStore;
  readonly newSeed: () => number;
  readonly onBack: () => void;
  readonly onRunning?: (running: boolean) => void;
};

type Run = {
  readonly settings: WaSettings;
  readonly round: WaRound;
  readonly run: number;
};

function newRun(settings: WaSettings, seed: number, run: number): Run {
  return {
    settings,
    round: startWaRound({ seed, classes: settings.classes }),
    run,
  };
}

const formatSec = (ms: number): string => `${(ms / 1000).toFixed(1)} s`;

const diffPrefix = (kind: "context" | "removed" | "added"): string =>
  kind === "removed" ? "- " : kind === "added" ? "+ " : "  ";

const stripTrailingNewline = (text: string): string => text.replace(/\r?\n$/, "");

/** Untimed 5-case competitive-programming bug hunt (T41 AC-4, ADR-T41-1). */
export function WaScreen({ clock, store, newSeed, onBack, onRunning }: WaScreenProps): ReactNode {
  const [current, setCurrent] = useState<Run>(() => newRun(loadWaSettings(store), newSeed(), 0));
  const [results, setResults] = useState<readonly WaRoundResult[]>(() => loadWaResults(store));
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [selectedClass, setSelectedClass] = useState<WaClass | null>(null);
  const [focusedLine, setFocusedLine] = useState(1);
  const [now, setNow] = useState(() => clock.now());

  const latest = useRef(current);
  const selectionRef = useRef({ selectedLine, selectedClass, focusedLine });
  useEffect(() => {
    selectionRef.current = { selectedLine, selectedClass, focusedLine };
  });

  const resetSelection = useCallback(() => {
    setSelectedLine(null);
    setSelectedClass(null);
    setFocusedLine(1);
    selectionRef.current = { selectedLine: null, selectedClass: null, focusedLine: 1 };
  }, []);

  const show = useCallback((next: Run) => {
    latest.current = next;
    setCurrent(next);
  }, []);

  const apply = useCallback(
    (round: WaRound) => {
      const run = latest.current;
      if (round === run.round) return;
      if (!isWaRoundFinished(run.round) && isWaRoundFinished(round)) {
        const stats = waRoundStats(round);
        const at = clock.wallTime();
        const elapsedMs = waElapsedMs(round, round.finishedAt ?? clock.now());
        appendWaResult(store, {
          version: 1,
          seed: round.config.seed,
          count: round.config.count,
          correct: stats.correct,
          wrong: stats.wrong,
          skipped: stats.skipped,
          elapsedMs,
          finishedAt: at,
        });
        recordEvents(store, waRoundEvents(round, at), at);
        setResults(loadWaResults(store));
      }
      show({ ...run, round });
    },
    [clock, show, store],
  );

  const { settings, round } = current;
  const finished = isWaRoundFinished(round);
  const running = round.startedAt !== null && !finished;
  useRunning(onRunning, running);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setNow(clock.now());
    }, TICK_MS);
    return () => {
      clearInterval(id);
    };
  }, [clock, running]);

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
      const bugClass = selectionRef.current.selectedClass;
      if (bugClass !== null) {
        resetSelection();
        apply(submitWaAnswer(cur, { line: lineNo, bugClass }, t));
      } else {
        setSelectedLine(lineNo);
        setFocusedLine(lineNo);
        selectionRef.current = {
          ...selectionRef.current,
          selectedLine: lineNo,
          focusedLine: lineNo,
        };
        apply(touchWaRound(cur, t));
      }
    },
    [apply, clock, resetSelection],
  );

  const pickClass = useCallback(
    (bugClass: WaClass) => {
      const cur = latest.current.round;
      const t = clock.now();
      setNow(t);
      const line = selectionRef.current.selectedLine;
      if (line !== null) {
        resetSelection();
        apply(submitWaAnswer(cur, { line, bugClass }, t));
      } else {
        setSelectedClass(bugClass);
        selectionRef.current = { ...selectionRef.current, selectedClass: bugClass };
        apply(touchWaRound(cur, t));
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
    apply(skipWaItem(latest.current.round, t));
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
        if (choice !== undefined) pickClass(choice.id);
      }
    },
    [continueAfterReview, exit, pickClass, pickLine, restart, skipCurrent],
  );

  // While a round is running (tree hidden), listen at window level so shortcuts 1-4, Enter and Esc always work.
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

  const toggleClass = (bugClass: WaClass, on: boolean) => {
    const updated = parseWaSettings({
      classes: WA_CLASSES.filter((c) =>
        c === bugClass ? on : latest.current.settings.classes.includes(c),
      ),
    });
    saveWaSettings(store, updated);
    restart(updated);
  };

  const historyScores = useMemo(() => results.map((r) => r.correct), [results]);
  const elapsedMs = waElapsedMs(round, now);
  const elapsedS = Math.floor(elapsedMs / 1000);
  const correctCount = round.results.filter((r) => r.ok).length;
  const stats = useMemo(() => (finished ? waRoundStats(round) : null), [finished, round]);
  const best = historyScores.length > 0 ? Math.max(...historyScores) : correctCount;

  const caseData = round.current.caseData;
  const reviewing = round.reviewing;
  const fixDiff = useMemo(
    () => (reviewing !== null ? diffSnippet(caseData.code, caseData.fixed, 1) : []),
    [caseData.code, caseData.fixed, reviewing],
  );

  const stepPrompt =
    reviewing !== null
      ? "Veja o contraexemplo, a saída errada contra a certa e a correção abaixo."
      : selectedLine !== null
        ? `Linha ${String(selectedLine)} selecionada — escolha a classe do bug (1–4).`
        : selectedClass !== null
          ? "Classe selecionada — clique na linha do bug (ou setas + Enter)."
          : "Clique na linha do bug (ou setas + Enter) e escolha a classe (1–4).";

  const isLastCase = round.results.length >= round.config.count;

  const onAreaKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    handleDrillKey(e);
  };

  return (
    <div className="screen wa">
      <PanelTitle title="Caça ao WA">
        Leia o enunciado e o código C++ que passa no exemplo, e aponte a linha e a classe do bug.
      </PanelTitle>

      <div className="vim-options-block" data-panel="options">
        <details className="vim-kinds-details" data-testid="wa-classes-details">
          <summary>Classes de bug</summary>
          <div className="vim-kinds compile-group-list">
            {WA_CLASSES.map((bugClass) => {
              const on = settings.classes.includes(bugClass);
              const only = on && settings.classes.length === 1;
              return (
                <span key={bugClass} className="vim-kind">
                  <label>
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={only}
                      onChange={(e) => {
                        toggleClass(bugClass, e.target.checked);
                      }}
                    />
                    {WA_CLASS_LABELS[bugClass]}
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
            headline={`${String(stats.correct)}/${String(round.config.count)} ${stats.correct === 1 ? "acerto" : "acertos"} em ${formatSec(elapsedMs)}`}
            headlineTestId="wa-final-score"
            pairs={[
              { label: "erros", value: stats.wrong },
              { label: "puladas", value: stats.skipped },
              { label: "precisão", value: `${String(Math.round(stats.accuracy * 100))}%` },
              { label: "tempo médio", value: formatSec(stats.avgTimeMs) },
              { label: "melhor", value: best },
            ]}
            extra={
              <table
                className="progress-table compile-group-table"
                data-testid="wa-class-table"
                aria-label="Desempenho por classe"
              >
                <thead>
                  <tr>
                    <th>Classe</th>
                    <th>Acertos</th>
                    <th>Tempo médio</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.byClass.map((row) => (
                    <tr key={row.bugClass}>
                      <td data-label="Classe">{waClassLabel(row.bugClass)}</td>
                      <td data-label="Acertos">{`${String(row.correct)}/${String(row.total)}`}</td>
                      <td data-label="Tempo médio">{formatSec(row.avgTimeMs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            }
            worst={
              stats.wrongItems.length > 0 ? (
                <div className="compile-wrong-wrap" data-testid="wa-wrong-list">
                  <h3>Erros para revisar</h3>
                  <ul className="vim-worst">
                    {stats.wrongItems.map((item) => (
                      <li key={item.index}>
                        <strong>{waClassLabel(item.bugClass)}</strong>{" "}
                        <span className="muted">linha {item.expectedLine}:</span> {item.explanation}
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
                  label: "caso",
                  value: `${String(round.current.index + 1)}/${String(round.config.count)}`,
                  testId: "wa-progress",
                },
                {
                  label: "tempo",
                  value: `${String(elapsedS)} s`,
                  testId: "wa-time",
                  tone: "accent",
                },
                { label: "acertos", value: correctCount, testId: "wa-score" },
              ]}
            />

            <div className="wa-statement-box" data-testid="wa-statement">
              <div className="wa-statement-head">
                <strong>{caseData.title}</strong>
              </div>
              <p className="wa-statement-text">{caseData.statement}</p>
              <div className="wa-sample-grid" data-testid="wa-sample">
                <div className="wa-io-block">
                  <span className="wa-io-label muted">Exemplo — entrada</span>
                  <pre className="wa-io-pre">{stripTrailingNewline(caseData.sample_input)}</pre>
                </div>
                <div className="wa-io-block">
                  <span className="wa-io-label muted">Exemplo — saída (passa)</span>
                  <pre className="wa-io-pre">{stripTrailingNewline(caseData.sample_output)}</pre>
                </div>
              </div>
            </div>

            <div className="compile-viewer">
              <div className="compile-file-bar">
                <span className="compile-group-badge">sol.cpp</span>
                <code className="compile-flags">{`g++ ${WA_JUDGE_FLAGS.join(" ")} sol.cpp`}</code>
              </div>

              <CodeLinePicker
                code={caseData.code}
                selectedLine={selectedLine}
                focusedLine={focusedLine}
                correctLine={reviewing?.expectedLine ?? null}
                wrongLine={reviewing?.selectedLine ?? null}
                disabled={reviewing !== null}
                onPickLine={pickLine}
                testId="wa-code"
              />
            </div>

            <p className="compile-step muted" data-testid="wa-step">
              {stepPrompt}
            </p>

            <ChoiceGrid
              choices={round.current.choices}
              selectedId={selectedClass}
              correctId={reviewing?.expectedClass ?? null}
              wrongId={reviewing?.selectedClass ?? null}
              disabled={reviewing !== null}
              onPick={pickClass}
              testId="wa-choices"
              ariaLabel="Classes de bug"
              itemAttrName="data-class"
            />

            {reviewing !== null ? (
              <div
                className={
                  reviewing.ok ? "wa-review wa-review-ok" : "wa-review compile-feedback-wrong"
                }
                data-testid="wa-feedback"
                data-outcome={reviewing.ok ? "correct" : "wrong"}
              >
                <p>
                  <strong>
                    {reviewing.ok ? "Correto — " : ""}Linha {reviewing.expectedLine} —{" "}
                    {waClassLabel(reviewing.expectedClass)} ({caseData.verdict}).
                  </strong>{" "}
                  {reviewing.explanation}
                </p>

                <div className="wa-counterexample" data-testid="wa-counterexample">
                  <div className="wa-io-block">
                    <span className="wa-io-label muted">Entrada que quebra</span>
                    <pre className="wa-io-pre" data-testid="wa-breaking-input">
                      {stripTrailingNewline(caseData.breaking_input)}
                    </pre>
                  </div>
                  <div className="wa-outputs-grid">
                    <div className="wa-io-block">
                      <span className="wa-io-label muted">Saída errada ({caseData.verdict})</span>
                      <pre className="wa-io-pre wa-out-wrong" data-testid="wa-wrong-output">
                        {stripTrailingNewline(caseData.wrong_output)}
                      </pre>
                    </div>
                    <div className="wa-io-block">
                      <span className="wa-io-label muted">Saída certa</span>
                      <pre className="wa-io-pre wa-out-ok" data-testid="wa-expected-output">
                        {stripTrailingNewline(caseData.expected_output)}
                      </pre>
                    </div>
                  </div>
                </div>

                <div className="wa-diff-box" data-testid="wa-diff">
                  <span className="wa-io-label muted">Correção</span>
                  <div className="wa-diff-lines">
                    {fixDiff.map((line, i) => (
                      <div key={i} className={`wa-diff-line wa-diff-${line.kind}`}>
                        {diffPrefix(line.kind)}
                        {line.text}
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  className="primary compile-next"
                  autoFocus
                  onClick={continueAfterReview}
                >
                  {isLastCase ? "Ver resultado" : "Próximo"} <kbd>Enter</kbd>
                </button>
              </div>
            ) : (
              round.last !== null &&
              round.last.skipped && (
                <p
                  className="compile-feedback compile-feedback-skip"
                  data-testid="wa-feedback"
                  data-outcome="skipped"
                >
                  Pulado. Linha {round.last.expectedLine} — {waClassLabel(round.last.expectedClass)}
                  : {round.last.explanation}
                </p>
              )
            )}
          </>
        )}
      </div>

      <RoundHistory scores={historyScores} unit="acertos" testId="wa-summary" />

      <Reference id="wa-checklist" title="Checklist antes de submeter" className="vim-commands">
        <ul>
          <li>
            <strong>Overflow:</strong> somas em <code>long long</code>, <code>1LL * a * b</code>{" "}
            antes de <code>% MOD</code>, <code>1LL &lt;&lt; k</code> e <code>accumulate</code> com{" "}
            <code>0LL</code>.
          </li>
          <li>
            <strong>Limite e borda:</strong> revise <code>&lt; n</code> contra <code>&lt;= n</code>,
            tamanho de <code>MAXN</code>, <code>n == 1</code>, todos iguais, resposta vazia e{" "}
            <code>%</code> de negativos.
          </li>
          <li>
            <strong>Multitest e leitura:</strong> zere estado global entre casos, nunca dê{" "}
            <code>break</code> antes de ler toda a entrada, cuidado com <code>getline</code>,
            espaços finais e <code>Case #i:</code>.
          </li>
          <li>
            <strong>Precisão, STL e TLE:</strong> evite <code>==</code> em <code>double</code>,
            ajuste <code>sqrt</code> inteiro, passe vetores por referência (<code>&amp;</code>),
            troque <code>lower_bound</code>/<code>upper_bound</code> e <code>multiset::erase</code>{" "}
            com cuidado e nunca faça <code>s.size() - 1</code> sem cast.
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
