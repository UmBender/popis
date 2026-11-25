import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Clock } from "../../core/clock";
import {
  evaluateRegexItem,
  judgeRegexSubmission,
  type CasarEval,
  type ExtrairEval,
  type LerEval,
  type TrocarEval,
} from "../../regex/check";
import { REGEX_DIALECTS, REGEX_DIALECT_LABELS } from "../../regex/compile";
import { REGEX_LESSONS, regexLessonForToken } from "../../regex/curriculum";
import {
  advanceSkippedRegexItem,
  isRegexRoundFinished,
  recordRegexAttempt,
  REGEX_ROUND_LENGTH,
  regexElapsedMs,
  regexPracticeEvents,
  regexRoundStats,
  revealSkipRegexItem,
  startRegexRound,
  touchRegexRound,
  type RegexRound,
} from "../../regex/round";
import {
  REGEX_ITEM_KINDS,
  REGEX_KIND_LABELS,
  type RegexItem,
  type RegexItemKind,
} from "../../regex/types";
import { recordEvents } from "../../storage/events";
import type { KeyValueStore } from "../../storage/history";
import {
  appendRegexResult,
  loadRegexResults,
  loadRegexSettings,
  parseRegexSettings,
  saveRegexSettings,
  type RegexRoundResult,
  type RegexSettings,
} from "../../storage/regex";
import { matchTrainingKey } from "../keys";
import { RoundHistory } from "../shell/History";
import { PanelTitle, Reference, useRunning } from "../shell/panel";
import { Result } from "../shell/Result";
import { RoundBar } from "../shell/RoundBar";
import { CasarLines, ExtrairLines, LerLines, TrocarLines } from "./MatchLines";
import { useFrameValue } from "./useFrameValue";

const TICK_MS = 100;

type Props = {
  readonly clock: Clock;
  readonly store: KeyValueStore;
  readonly newSeed: () => number;
  readonly onBack: () => void;
  readonly onRunning?: (running: boolean) => void;
  readonly onLearn?: (lessonId?: string) => void;
};

type Run = {
  readonly settings: RegexSettings;
  readonly round: RegexRound;
  readonly run: number;
};

function newRun(settings: RegexSettings, seed: number, run: number): Run {
  return {
    settings,
    round: startRegexRound({
      seed,
      dialect: settings.dialect,
      kinds: settings.kinds,
    }),
    run,
  };
}

const formatSec = (ms: number): string => `${(ms / 1000).toFixed(1)} s`;

export function canonicalDisplay(item: RegexItem): string {
  if (item.kind === "trocar") {
    return `${item.canonical}  →  ${item.canonicalReplacement === "" ? "(vazio)" : item.canonicalReplacement}`;
  }
  return item.canonical;
}

function emptySelection(item: RegexItem): boolean[] {
  return item.kind === "ler" ? item.lines.map(() => false) : [];
}

/** Regex Prática screen: live-highlighted 5-item round with stopwatch (T45 AC-5). */
export function PracticeDrill({
  clock,
  store,
  newSeed,
  onBack,
  onRunning,
  onLearn,
}: Props): ReactNode {
  const [current, setCurrent] = useState<Run>(() => newRun(loadRegexSettings(store), newSeed(), 0));
  const [results, setResults] = useState<readonly RegexRoundResult[]>(() =>
    loadRegexResults(store),
  );
  const [pattern, setPattern] = useState("");
  const [replacement, setReplacement] = useState("");
  const [selected, setSelected] = useState<boolean[]>(() =>
    emptySelection(current.round.items[0]!),
  );
  const [feedback, setFeedback] = useState<string | null>(null);
  const [now, setNow] = useState(() => clock.now());

  const latest = useRef(current);
  const inputRef = useRef<HTMLInputElement>(null);

  const show = useCallback((next: Run) => {
    latest.current = next;
    setCurrent(next);
  }, []);

  const resetInputs = useCallback((item: RegexItem) => {
    setPattern("");
    setReplacement("");
    setSelected(emptySelection(item));
    setFeedback(null);
  }, []);

  const apply = useCallback(
    (round: RegexRound) => {
      const run = latest.current;
      if (!isRegexRoundFinished(run.round) && isRegexRoundFinished(round)) {
        const stats = regexRoundStats(round);
        const at = clock.wallTime();
        appendRegexResult(store, {
          version: 1,
          dialect: round.config.dialect,
          seed: round.config.seed,
          correct: stats.correct,
          skipped: stats.skipped,
          attempts: stats.totalAttempts,
          timeMs: stats.totalTimeMs,
          finishedAt: at,
        });
        recordEvents(store, regexPracticeEvents(round, at), at);
        setResults(loadRegexResults(store));
      }
      if (round.index !== run.round.index && !isRegexRoundFinished(round)) {
        resetInputs(round.items[round.index]!);
      }
      show({ ...run, round });
    },
    [clock, resetInputs, show, store],
  );

  const { settings, round } = current;
  const finished = isRegexRoundFinished(round);
  const running = round.startedAt !== null && !finished;
  const item = round.items[round.index]!;
  useRunning(onRunning, running);

  useEffect(() => {
    if (!finished && item.kind !== "ler") inputRef.current?.focus();
  }, [current.run, round.index, finished, item.kind]);

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
      const next = newRun(nextSettings, newSeed(), latest.current.run + 1);
      setNow(clock.now());
      resetInputs(next.round.items[0]!);
      show(next);
    },
    [clock, newSeed, resetInputs, show],
  );

  const exit = useCallback(() => {
    const run = latest.current;
    const reset = newRun(run.settings, run.round.config.seed, run.run);
    resetInputs(reset.round.items[0]!);
    show(reset);
    inputRef.current?.blur();
  }, [resetInputs, show]);

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
    const updated = parseRegexSettings({ ...latest.current.settings, ...patch });
    saveRegexSettings(store, updated);
    restart(updated);
  };

  const toggleKind = (kind: RegexItemKind, on: boolean) => {
    change({
      kinds: REGEX_ITEM_KINDS.filter((k) =>
        k === kind ? on : latest.current.settings.kinds.includes(k),
      ),
    });
  };

  const touch = () => {
    if (latest.current.round.startedAt !== null) return;
    const t = clock.now();
    setNow(t);
    apply(touchRegexRound(latest.current.round, t));
  };

  const liveInput = useFrameValue({ pattern, replacement });
  const idle = !round.skippedCurrent && liveInput.pattern.length === 0;

  const liveEval = useMemo(() => {
    if (round.skippedCurrent) {
      return evaluateRegexItem(item, {
        pattern: item.kind === "ler" ? item.pattern : item.canonical,
        replacement: item.kind === "trocar" ? item.canonicalReplacement : "",
        selected,
      });
    }
    if (item.kind !== "ler" && idle) return null;
    return evaluateRegexItem(item, {
      pattern: liveInput.pattern,
      replacement: liveInput.replacement,
      selected,
    });
  }, [idle, item, liveInput.pattern, liveInput.replacement, round.skippedCurrent, selected]);

  const liveError =
    !round.skippedCurrent && liveEval !== null && !liveEval.ok ? liveEval.error : null;

  const advanceSkip = () => {
    const t = clock.now();
    setNow(t);
    apply(advanceSkippedRegexItem(latest.current.round, t));
  };

  const skipCurrent = () => {
    const cur = latest.current.round;
    const t = clock.now();
    setNow(t);
    if (cur.skippedCurrent) {
      apply(advanceSkippedRegexItem(cur, t));
      return;
    }
    setFeedback(null);
    apply(revealSkipRegexItem(cur, t));
  };

  const submitCurrent = () => {
    const cur = latest.current.round;
    if (cur.skippedCurrent) {
      advanceSkip();
      return;
    }
    const active = cur.items[cur.index]!;
    if (active.kind !== "ler" && pattern.length === 0) return;
    const t = clock.now();
    setNow(t);
    const verdict = judgeRegexSubmission(active, { pattern, replacement, selected });
    setFeedback(verdict.feedback);
    apply(recordRegexAttempt(cur, verdict.passed, t));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const action = matchTrainingKey(e.nativeEvent);
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
    if (e.key === "Enter" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      submitCurrent();
    }
  };

  const historyScores = useMemo(
    () => results.filter((r) => r.dialect === settings.dialect).map((r) => r.correct),
    [results, settings.dialect],
  );
  const elapsedS = Math.floor(regexElapsedMs(round, now) / 1000);
  const stats = useMemo(() => (finished ? regexRoundStats(round) : null), [finished, round]);
  const best = historyScores.length > 0 ? Math.max(...historyScores) : (stats?.correct ?? 0);

  const quickReference = useMemo(
    () => (
      <ul>
        {REGEX_LESSONS.flatMap((lesson) => lesson.tokens)
          .filter((t, i, arr) => arr.findIndex((x) => x.syntax === t.syntax) === i)
          .slice(0, 14)
          .map((token) => {
            const lesson = regexLessonForToken(token.syntax)!;
            return (
              <li key={token.syntax}>
                <code>{token.syntax}</code> — {token.desc}
                {onLearn !== undefined && (
                  <>
                    {" "}
                    <button
                      type="button"
                      className="link vim-cmd-learn"
                      onClick={() => {
                        onLearn(lesson.id);
                      }}
                    >
                      aprender
                    </button>
                  </>
                )}
              </li>
            );
          })}
      </ul>
    ),
    [onLearn],
  );

  return (
    <div className="screen regex">
      <PanelTitle title="Prática">
        Escreva a expressão regular e veja ao vivo quais linhas casam. Rodada de 5 itens, sem limite
        de tempo por item.
      </PanelTitle>

      <div className="vim-options-block" data-panel="options">
        <div className="vim-options" role="group" aria-label="Opções">
          <label htmlFor="regex-dialect">Dialeto</label>
          <select
            id="regex-dialect"
            value={settings.dialect}
            onChange={(e) => {
              change({ dialect: e.target.value });
            }}
          >
            {REGEX_DIALECTS.map((d) => (
              <option key={d} value={d}>
                {REGEX_DIALECT_LABELS[d]}
              </option>
            ))}
          </select>
        </div>

        <details className="vim-kinds-details" data-testid="regex-kinds-details">
          <summary>Tipos de item</summary>
          <div className="vim-kinds">
            {REGEX_ITEM_KINDS.map((kind) => {
              const on = settings.kinds.includes(kind);
              const only = on && settings.kinds.length === 1;
              return (
                <span key={kind} className="vim-kind">
                  <label>
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={only}
                      onChange={(e) => {
                        toggleKind(kind, e.target.checked);
                      }}
                    />
                    {REGEX_KIND_LABELS[kind]}
                  </label>
                </span>
              );
            })}
          </div>
        </details>
      </div>

      <div className="regex-area" data-panel="area">
        {finished && stats !== null ? (
          <Result
            headline={`${String(stats.correct)}/${String(stats.total)} ${stats.correct === 1 ? "acerto" : "acertos"} em ${formatSec(stats.totalTimeMs)}`}
            headlineTestId="regex-final-score"
            pairs={[
              { label: "puladas", value: stats.skipped },
              { label: "tentativas", value: stats.totalAttempts },
              { label: "tempo", value: formatSec(stats.totalTimeMs) },
              { label: "melhor", value: `${String(best)}/${String(REGEX_ROUND_LENGTH)}` },
            ]}
            extra={
              <table
                className="progress-table regex-result-table"
                data-testid="regex-result-table"
                aria-label="Resultado por item"
              >
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Tipo</th>
                    <th>Estado</th>
                    <th>Tentativas</th>
                    <th>Tempo</th>
                    <th>Canônica</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.records.map((rec) => (
                    <tr key={rec.index}>
                      <td data-label="#">{rec.index + 1}</td>
                      <td data-label="Tipo">{REGEX_KIND_LABELS[rec.item.kind]}</td>
                      <td data-label="Estado">{rec.ok ? "✓" : "pulado"}</td>
                      <td data-label="Tentativas">{rec.attempts}</td>
                      <td data-label="Tempo">{formatSec(rec.timeMs)}</td>
                      <td data-label="Canônica">
                        <code>{canonicalDisplay(rec.item)}</code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                  label: "item",
                  value: `${String(round.index + 1)} / ${String(REGEX_ROUND_LENGTH)}`,
                  testId: "regex-progress",
                },
                {
                  label: "tempo",
                  value: `${String(elapsedS)} s`,
                  testId: "regex-time",
                  tone: "accent",
                },
                {
                  label: "dialeto",
                  value: REGEX_DIALECT_LABELS[item.dialect],
                  testId: "regex-dialect-badge",
                },
              ]}
            />

            <div className="regex-item-head">
              <p className="gdb-prompt" data-testid="regex-prompt">
                {item.prompt}
              </p>
              <span className="regex-mode-badge muted" data-testid="regex-mode-badge">
                {item.kind === "trocar"
                  ? item.dialect === "python"
                    ? "re.sub"
                    : "sed -E"
                  : `modo: ${item.mode}`}
              </span>
            </div>

            <form
              className="regex-form"
              onSubmit={(e) => {
                e.preventDefault();
                submitCurrent();
              }}
            >
              {item.kind !== "ler" && (
                <div className="regex-input-stack">
                  <div className="gdb-input-row">
                    <span className="gdb-prompt-prefix" aria-hidden="true">
                      /
                    </span>
                    <input
                      ref={inputRef}
                      type="text"
                      className="gdb-input"
                      aria-label="Expressão regular"
                      placeholder={
                        item.dialect === "python" ? "ex.: ^\\d+\\.\\d+$" : "ex.: ^[0-9]+\\.[0-9]+$"
                      }
                      value={pattern}
                      disabled={round.skippedCurrent}
                      autoComplete="off"
                      autoCapitalize="off"
                      autoCorrect="off"
                      spellCheck={false}
                      enterKeyHint="send"
                      onChange={(e) => {
                        setPattern(e.target.value);
                        setFeedback(null);
                        touch();
                      }}
                      onKeyDown={handleKeyDown}
                    />
                  </div>

                  {item.kind === "trocar" && (
                    <div className="gdb-input-row">
                      <span className="gdb-prompt-prefix" aria-hidden="true">
                        →
                      </span>
                      <input
                        type="text"
                        className="gdb-input"
                        aria-label="Substituição"
                        placeholder={
                          item.dialect === "python" ? "ex.: \\1 ou \\g<1>" : "ex.: \\1 ou &"
                        }
                        value={replacement}
                        disabled={round.skippedCurrent}
                        autoComplete="off"
                        autoCapitalize="off"
                        autoCorrect="off"
                        spellCheck={false}
                        enterKeyHint="send"
                        onChange={(e) => {
                          setReplacement(e.target.value);
                          setFeedback(null);
                          touch();
                        }}
                        onKeyDown={handleKeyDown}
                      />
                    </div>
                  )}

                  {liveError !== null && (
                    <p className="regex-error" role="alert" data-testid="regex-error">
                      {liveError}
                    </p>
                  )}
                </div>
              )}

              {item.kind === "casar" && (
                <CasarLines item={item} evaluation={liveEval as CasarEval | null} idle={idle} />
              )}
              {item.kind === "extrair" && (
                <ExtrairLines item={item} evaluation={liveEval as ExtrairEval | null} idle={idle} />
              )}
              {item.kind === "trocar" && (
                <TrocarLines item={item} evaluation={liveEval as TrocarEval | null} idle={idle} />
              )}
              {item.kind === "ler" && (
                <LerLines
                  item={item}
                  selected={selected}
                  revealed={round.skippedCurrent}
                  evaluation={liveEval as LerEval}
                  onToggle={(idx) => {
                    touch();
                    setFeedback(null);
                    setSelected((prev) => prev.map((v, i) => (i === idx ? !v : v)));
                  }}
                />
              )}

              {round.skippedCurrent && (
                <p className="regex-canonical" data-testid="regex-canonical">
                  Canônica: <code>{canonicalDisplay(item)}</code> — {item.explanation}
                </p>
              )}

              {feedback !== null && !round.skippedCurrent && (
                <p className="gdb-feedback gdb-feedback-wrong" data-testid="regex-feedback">
                  {feedback}
                </p>
              )}

              <div className="actions">
                {round.skippedCurrent ? (
                  <button type="button" className="primary" onClick={advanceSkip}>
                    Próximo
                  </button>
                ) : (
                  <>
                    <button type="submit" className="primary">
                      {item.kind === "ler" ? "Conferir" : "Enviar"}
                    </button>
                    <button type="button" onClick={skipCurrent}>
                      Pular
                    </button>
                  </>
                )}
              </div>
            </form>
          </>
        )}
      </div>

      <RoundHistory scores={historyScores} unit="acertos" testId="regex-summary" />

      <Reference id="regex-ref" title="Referência rápida" className="vim-commands">
        {quickReference}
      </Reference>

      <div className="actions">
        <button type="button" onClick={onBack}>
          Voltar
        </button>
      </div>
    </div>
  );
}
