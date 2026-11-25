import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Clock } from "../../core/clock";
import { SHELL_COMMAND_TABLE } from "../../shell/check";
import { shellLessonForCommand } from "../../shell/curriculum";
import {
  SHELL_DRILL_KINDS,
  SHELL_DRILL_KIND_LABELS,
  type ShellDrillKind,
} from "../../shell/drill";
import {
  isShellRoundFinished,
  SHELL_DURATIONS_S,
  shellCommandEvents,
  shellRemainingMs,
  shellRoundStats,
  skipShellItem,
  startShellRound,
  submitShellCommand,
  tickShellRound,
  touchShellRound,
  type ShellRound,
} from "../../shell/round";
import { recordEvents } from "../../storage/events";
import type { KeyValueStore } from "../../storage/history";
import {
  appendShellResult,
  loadShellResults,
  loadShellSettings,
  parseShellSettings,
  saveShellSettings,
  type ShellCmdResult,
  type ShellSettings,
} from "../../storage/shell";
import { matchTrainingKey } from "../keys";
import { RoundHistory } from "../shell/History";
import { PanelTitle, Reference, useRunning } from "../shell/panel";
import { Result } from "../shell/Result";
import { RoundBar } from "../shell/RoundBar";
import { TerminalView } from "./TerminalView";

const TICK_MS = 100;

const KIND_FAMILIES: readonly {
  readonly title: string;
  readonly kinds: readonly ShellDrillKind[];
}[] = [
  { title: "Dia a dia da prova", kinds: ["arquivos", "compilar", "rodar"] },
  { title: "Testar e estressar", kinds: ["comparar", "stress"] },
  { title: "Limites, texto e setup", kinds: ["limites", "texto", "setup"] },
];

type Props = {
  readonly clock: Clock;
  readonly store: KeyValueStore;
  readonly newSeed: () => number;
  readonly onBack: () => void;
  readonly onRunning?: (running: boolean) => void;
  readonly onLearn?: (lessonId?: string) => void;
};

type Run = {
  readonly settings: ShellSettings;
  readonly round: ShellRound;
  readonly run: number;
};

function newRun(settings: ShellSettings, seed: number, run: number): Run {
  return {
    settings,
    round: startShellRound({
      durationMs: settings.durationS * 1000,
      seed,
      kinds: settings.kinds,
    }),
    run,
  };
}

const formatSec = (ms: number): string => `${(ms / 1000).toFixed(1)} s`;

/** Shell Comandos timed drill (T39 AC-5, ADR-T39-1). */
export function CommandDrill({
  clock,
  store,
  newSeed,
  onBack,
  onRunning,
  onLearn,
}: Props): ReactNode {
  const [current, setCurrent] = useState<Run>(() =>
    newRun(loadShellSettings(store), newSeed(), 0),
  );
  const [results, setResults] = useState<readonly ShellCmdResult[]>(() => loadShellResults(store));
  const [text, setText] = useState("");
  const [now, setNow] = useState(() => clock.now());
  const latest = useRef(current);
  const inputRef = useRef<HTMLInputElement>(null);

  const show = useCallback((next: Run) => {
    latest.current = next;
    setCurrent(next);
  }, []);

  const apply = useCallback(
    (round: ShellRound) => {
      const run = latest.current;
      if (round === run.round) return;
      if (!isShellRoundFinished(run.round) && isShellRoundFinished(round)) {
        const stats = shellRoundStats(round);
        const at = clock.wallTime();
        appendShellResult(store, {
          version: 1,
          durationS: round.config.durationMs / 1000,
          seed: round.config.seed,
          correct: stats.correct,
          wrong: stats.wrong,
          skipped: stats.skipped,
          finishedAt: at,
        });
        recordEvents(store, shellCommandEvents(round, at), at);
        setResults(loadShellResults(store));
      }
      show({ ...run, round });
    },
    [clock, show, store],
  );

  const { settings, round } = current;
  const finished = isShellRoundFinished(round);
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
      apply(tickShellRound(latest.current.round, t));
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
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [exit, finished, restart]);

  const change = (patch: Readonly<Record<string, unknown>>) => {
    const updated = parseShellSettings({ ...latest.current.settings, ...patch });
    saveShellSettings(store, updated);
    restart(updated);
  };

  const toggleKind = (kind: ShellDrillKind, on: boolean) => {
    change({
      kinds: SHELL_DRILL_KINDS.filter((k) =>
        k === kind ? on : latest.current.settings.kinds.includes(k),
      ),
    });
  };

  const submitCurrent = () => {
    const trimmed = text.trim();
    const cur = latest.current.round;
    if (trimmed.length === 0) return;
    const t = clock.now();
    setNow(t);
    setText("");
    apply(submitShellCommand(cur, trimmed, t));
  };

  const historyScores = useMemo(
    () => results.filter((r) => r.durationS === settings.durationS).map((r) => r.correct),
    [results, settings.durationS],
  );

  const remainingS = Math.ceil(
    shellRemainingMs(round, Math.max(now, round.startedAt ?? now)) / 1000,
  );
  const correctCount = round.results.filter((r) => r.ok).length;
  const stats = useMemo(() => (finished ? shellRoundStats(round) : null), [finished, round]);
  const best = historyScores.length > 0 ? Math.max(...historyScores) : correctCount;

  const commandList = useMemo(
    () => (
      <ul>
        {SHELL_COMMAND_TABLE.map((entry) => {
          const lesson = shellLessonForCommand(entry.key);
          return (
            <li key={entry.key}>
              <code>{entry.key}</code> — {entry.text}
              {lesson !== undefined && onLearn !== undefined && (
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
    <div className="screen shell-drill">
      <PanelTitle title="Comandos">
        Digite a linha de bash que cumpre o objetivo de prova no terminal.
      </PanelTitle>

      <div className="vim-options-block" data-panel="options">
        <div className="vim-options" role="group" aria-label="Opções">
          <label htmlFor="shell-duration">Duração</label>
          <select
            id="shell-duration"
            value={settings.durationS}
            onChange={(e) => {
              change({ durationS: Number(e.target.value) });
            }}
          >
            {SHELL_DURATIONS_S.map((s) => (
              <option key={s} value={s}>
                {`${String(s)} s`}
              </option>
            ))}
          </select>
        </div>

        <details className="vim-kinds-details" data-testid="shell-kinds-details">
          <summary>Tipos de comando</summary>
          {KIND_FAMILIES.map((family) => (
            <div key={family.title} className="vim-kind-family">
              <h3>{family.title}</h3>
              <div className="vim-kinds">
                {family.kinds.map((kind) => {
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
                        {SHELL_DRILL_KIND_LABELS[kind]}
                      </label>
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </details>
      </div>

      <div className="gdb-area" data-panel="area">
        {finished && stats !== null ? (
          <Result
            headline={`${String(stats.correct)} ${stats.correct === 1 ? "acerto" : "acertos"} em ${String(settings.durationS)} s`}
            headlineTestId="shell-final-score"
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
                  data-testid="shell-kind-table"
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
                        <td data-label="Tipo">{SHELL_DRILL_KIND_LABELS[row.kind]}</td>
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
                <div className="gdb-wrong-wrap" data-testid="shell-wrong-list">
                  <h3>Comandos errados</h3>
                  <ul className="vim-worst">
                    {stats.wrongItems.map((item) => (
                      <li key={item.index}>
                        <span>{item.prompt}</span> <span className="muted">você:</span>{" "}
                        <code>{item.typed}</code> <span className="muted">canônico:</span>{" "}
                        <code>{item.canonical}</code>
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
                  testId: "shell-time",
                  tone: remainingS <= 10 ? "warning" : "accent",
                },
                { label: "acertos", value: correctCount, testId: "shell-score" },
              ]}
            />

            <p className="gdb-prompt" data-testid="shell-prompt">
              {round.current.prompt}
            </p>

            <TerminalView
              cwd={round.current.cwd}
              files={round.current.files}
              terminalLines={round.current.terminalLines}
              filesTestId="shell-files"
              terminalTestId="shell-terminal"
            />

            <form
              className="gdb-input-row"
              onSubmit={(e) => {
                e.preventDefault();
                submitCurrent();
              }}
            >
              <span className="gdb-prompt-prefix" aria-hidden="true">
                $
              </span>
              <input
                ref={inputRef}
                type="text"
                className="gdb-input"
                aria-label="Comando bash"
                placeholder="ex.: g++ -O2 -std=gnu++20 a.cpp -o a"
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
                    apply(touchShellRound(latest.current.round, t));
                  }
                }}
                onKeyDown={(e) => {
                  const action = matchTrainingKey(e);
                  if (action === "skip") {
                    e.preventDefault();
                    const t = clock.now();
                    setNow(t);
                    setText("");
                    apply(skipShellItem(latest.current.round, t));
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
                data-testid="shell-feedback"
                data-outcome={round.last.skipped ? "skipped" : round.last.ok ? "correct" : "wrong"}
              >
                {round.last.ok ? (
                  <>
                    Correto: <code>{round.last.typed}</code>
                  </>
                ) : round.last.skipped ? (
                  <>
                    Pulado. Canônico: <code>{round.last.canonical}</code>
                  </>
                ) : (
                  <>
                    Esperado: <code>{round.last.canonical}</code> — {round.last.reason}
                  </>
                )}
              </p>
            )}
          </>
        )}
      </div>

      <RoundHistory scores={historyScores} unit="acertos" testId="shell-summary" />

      <Reference id="shell-commands" title="Comandos" className="vim-commands">
        {commandList}
      </Reference>

      <div className="actions">
        <button type="button" onClick={onBack}>
          Voltar
        </button>
      </div>
    </div>
  );
}
