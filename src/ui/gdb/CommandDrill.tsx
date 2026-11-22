import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Clock } from "../../core/clock";
import {
  GDB_CMD_KINDS,
  GDB_CMD_KIND_LABELS,
  type GdbCmdKind,
} from "../../gdb/cmd-drill";
import { COMMAND_TABLE } from "../../gdb/commands";
import { gdbLessonForCommand } from "../../gdb/curriculum";
import {
  GDB_DURATIONS_S,
  gdbCommandEvents,
  gdbRemainingMs,
  gdbRoundStats,
  isGdbRoundFinished,
  skipGdbItem,
  startGdbRound,
  submitGdbCommand,
  tickGdbRound,
  touchGdbRound,
  type GdbRound,
} from "../../gdb/round";
import { recordEvents } from "../../storage/events";
import {
  appendGdbResult,
  loadGdbResults,
  loadGdbSettings,
  parseGdbSettings,
  saveGdbSettings,
  type GdbCmdResult,
  type GdbSettings,
} from "../../storage/gdb";
import type { KeyValueStore } from "../../storage/history";
import { matchTrainingKey } from "../keys";
import { RoundHistory } from "../shell/History";
import { PanelTitle, Reference, useRunning } from "../shell/panel";
import { Result } from "../shell/Result";
import { RoundBar } from "../shell/RoundBar";
import { CodeView } from "./CodeView";

const TICK_MS = 100;

const KIND_FAMILIES: readonly { readonly title: string; readonly kinds: readonly GdbCmdKind[] }[] = [
  { title: "Preparar e parar", kinds: ["iniciar", "break-linha", "break-funcao", "tbreak", "gerir"] },
  { title: "Andar, olhar e pilha", kinds: ["andar", "olhar", "pilha"] },
  { title: "Condições, vigias, estado e crash", kinds: ["break-cond", "condition", "ignore", "vigia", "mudar", "crash"] },
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
  readonly settings: GdbSettings;
  readonly round: GdbRound;
  readonly run: number;
};

function newRun(settings: GdbSettings, seed: number, run: number): Run {
  return {
    settings,
    round: startGdbRound({
      durationMs: settings.durationS * 1000,
      seed,
      kinds: settings.kinds,
    }),
    run,
  };
}

const formatSec = (ms: number): string => `${(ms / 1000).toFixed(1)} s`;

/** GDB Comandos timed drill (T25 AC-5). */
export function CommandDrill({
  clock,
  store,
  newSeed,
  onBack,
  onRunning,
  onLearn,
}: Props): ReactNode {
  const [current, setCurrent] = useState<Run>(() => newRun(loadGdbSettings(store), newSeed(), 0));
  const [results, setResults] = useState<readonly GdbCmdResult[]>(() => loadGdbResults(store));
  const [text, setText] = useState("");
  const [now, setNow] = useState(() => clock.now());
  const latest = useRef(current);
  const inputRef = useRef<HTMLInputElement>(null);

  const show = useCallback((next: Run) => {
    latest.current = next;
    setCurrent(next);
  }, []);

  const apply = useCallback(
    (round: GdbRound) => {
      const run = latest.current;
      if (round === run.round) return;
      if (!isGdbRoundFinished(run.round) && isGdbRoundFinished(round)) {
        const stats = gdbRoundStats(round);
        const at = clock.wallTime();
        appendGdbResult(store, {
          version: 1,
          durationS: round.config.durationMs / 1000,
          seed: round.config.seed,
          correct: stats.correct,
          wrong: stats.wrong,
          skipped: stats.skipped,
          finishedAt: at,
        });
        recordEvents(store, gdbCommandEvents(round, at), at);
        setResults(loadGdbResults(store));
      }
      show({ ...run, round });
    },
    [clock, show, store],
  );

  const { settings, round } = current;
  const finished = isGdbRoundFinished(round);
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
      apply(tickGdbRound(latest.current.round, t));
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
    const updated = parseGdbSettings({ ...latest.current.settings, ...patch });
    saveGdbSettings(store, updated);
    restart(updated);
  };

  const toggleKind = (kind: GdbCmdKind, on: boolean) => {
    change({
      kinds: GDB_CMD_KINDS.filter((k) =>
        k === kind ? on : latest.current.settings.kinds.includes(k),
      ),
    });
  };

  const submitCurrent = () => {
    const trimmed = text.trim();
    const cur = latest.current.round;
    if (trimmed.length === 0 && cur.current.expected.kind !== "repeat") return;
    const t = clock.now();
    setNow(t);
    setText("");
    apply(submitGdbCommand(cur, trimmed, t));
  };

  const historyScores = useMemo(
    () => results.filter((r) => r.durationS === settings.durationS).map((r) => r.correct),
    [results, settings.durationS],
  );

  const remainingS = Math.ceil(gdbRemainingMs(round, Math.max(now, round.startedAt ?? now)) / 1000);
  const correctCount = round.results.filter((r) => r.ok).length;
  const stats = useMemo(() => (finished ? gdbRoundStats(round) : null), [finished, round]);
  const best = historyScores.length > 0 ? Math.max(...historyScores) : correctCount;

  const commandList = useMemo(
    () => (
      <ul>
        {COMMAND_TABLE.map((entry) => {
          const lesson = gdbLessonForCommand(entry.key);
          return (
            <li key={entry.key}>
              <code>{entry.key}</code>
              {entry.aliases.length > 0 && (
                <span className="muted">{` (${entry.aliases.join(", ")})`}</span>
              )}{" "}
              — {entry.text}
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
    <div className="screen gdb">
      <PanelTitle title="Comandos">
        Digite o comando do gdb que cumpre o objetivo no estado de parada.
      </PanelTitle>

      <div className="vim-options-block" data-panel="options">
        <div className="vim-options" role="group" aria-label="Opções">
          <label htmlFor="gdb-duration">Duração</label>
          <select
            id="gdb-duration"
            value={settings.durationS}
            onChange={(e) => {
              change({ durationS: Number(e.target.value) });
            }}
          >
            {GDB_DURATIONS_S.map((s) => (
              <option key={s} value={s}>
                {`${String(s)} s`}
              </option>
            ))}
          </select>
        </div>

        <details className="vim-kinds-details" data-testid="gdb-kinds-details">
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
                        {GDB_CMD_KIND_LABELS[kind]}
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
            headlineTestId="gdb-final-score"
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
                  data-testid="gdb-kind-table"
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
                        <td data-label="Tipo">{GDB_CMD_KIND_LABELS[row.kind]}</td>
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
                <div className="gdb-wrong-wrap" data-testid="gdb-wrong-list">
                  <h3>Comandos errados</h3>
                  <ul className="vim-worst">
                    {stats.wrongItems.map((item) => (
                      <li key={item.index}>
                        <span>{item.prompt}</span>{" "}
                        <span className="muted">você:</span> <code>{item.typed || "(vazio)"}</code>{" "}
                        <span className="muted">canônico:</span> <code>{item.canonical}</code>
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
                  testId: "gdb-time",
                  tone: remainingS <= 10 ? "warning" : "accent",
                },
                { label: "acertos", value: correctCount, testId: "gdb-score" },
              ]}
            />

            <p className="gdb-prompt" data-testid="gdb-prompt">
              {round.current.prompt}
            </p>

            <CodeView
              file={round.current.file}
              lines={round.current.lines}
              currentLine={round.current.stop.line}
              breakpoints={round.current.stop.breakpoints}
              sessionLines={round.current.stop.sessionLines}
              codeTestId="gdb-code"
              sessionTestId="gdb-session"
            />

            <form
              className="gdb-input-row"
              onSubmit={(e) => {
                e.preventDefault();
                submitCurrent();
              }}
            >
              <span className="gdb-prompt-prefix" aria-hidden="true">
                (gdb)
              </span>
              <input
                ref={inputRef}
                type="text"
                className="gdb-input"
                aria-label="Comando gdb"
                placeholder="ex.: b 14 if i == 5"
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
                    apply(touchGdbRound(latest.current.round, t));
                  }
                }}
                onKeyDown={(e) => {
                  const action = matchTrainingKey(e);
                  if (action === "skip") {
                    e.preventDefault();
                    const t = clock.now();
                    setNow(t);
                    setText("");
                    apply(skipGdbItem(latest.current.round, t));
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
                data-testid="gdb-feedback"
                data-outcome={
                  round.last.skipped ? "skipped" : round.last.ok ? "correct" : "wrong"
                }
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

      <RoundHistory scores={historyScores} unit="acertos" testId="gdb-summary" />

      <Reference id="gdb-commands" title="Comandos" className="vim-commands">
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
