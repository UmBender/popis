import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Clock } from "../../core/clock";
import { OUTPUT_FORMAT_TABLE, gdbLessonForOutputKey } from "../../gdb/curriculum";
import {
  GDB_OUT_KINDS,
  GDB_OUT_KIND_LABELS,
  GDB_OUT_LEVELS,
  type GdbOutKind,
} from "../../gdb/out-drill";
import {
  gdbOutRemainingMs,
  gdbOutRoundStats,
  gdbOutputEvents,
  isGdbOutRoundFinished,
  skipGdbOutItem,
  startGdbOutRound,
  submitGdbOutput,
  tickGdbOutRound,
  touchGdbOutRound,
  type GdbOutRound,
} from "../../gdb/out-round";
import { GDB_DURATIONS_S } from "../../gdb/round";
import { recordEvents } from "../../storage/events";
import {
  appendGdbOutResult,
  loadGdbOutResults,
  loadGdbOutSettings,
  parseGdbOutSettings,
  saveGdbOutSettings,
  type GdbOutResult,
  type GdbOutSettings,
} from "../../storage/gdb";
import type { KeyValueStore } from "../../storage/history";
import { matchTrainingKey } from "../keys";
import { RoundHistory } from "../shell/History";
import { PanelTitle, Reference, useRunning } from "../shell/panel";
import { Result } from "../shell/Result";
import { RoundBar } from "../shell/RoundBar";
import { CodeView } from "./CodeView";

const TICK_MS = 100;

const KIND_FAMILIES: readonly { readonly title: string; readonly kinds: readonly GdbOutKind[] }[] =
  [
    { title: "Formatos e expressões", kinds: ["formato", "char", "expressao"] },
    { title: "Coleções e tipos", kinds: ["array", "string", "struct", "ponteiro"] },
    { title: "Memória e ABI", kinds: ["sizeof", "memoria"] },
  ];

export type OutputDrillProps = {
  readonly clock: Clock;
  readonly store: KeyValueStore;
  readonly newSeed: () => number;
  readonly onBack: () => void;
  readonly onRunning?: (running: boolean) => void;
  readonly onLearn?: (lessonId?: string) => void;
};

type Run = {
  readonly settings: GdbOutSettings;
  readonly round: GdbOutRound;
  readonly run: number;
};

function newRun(settings: GdbOutSettings, seed: number, run: number): Run {
  return {
    settings,
    round: startGdbOutRound({
      durationMs: settings.durationS * 1000,
      seed,
      level: settings.level,
      kinds: settings.kinds,
    }),
    run,
  };
}

const formatSec = (ms: number): string => `${(ms / 1000).toFixed(1)} s`;

/** GDB Saída timed drill (T26 AC-7). */
export function OutputDrill({
  clock,
  store,
  newSeed,
  onBack,
  onRunning,
  onLearn,
}: OutputDrillProps): ReactNode {
  const [current, setCurrent] = useState<Run>(() =>
    newRun(loadGdbOutSettings(store), newSeed(), 0),
  );
  const [results, setResults] = useState<readonly GdbOutResult[]>(() => loadGdbOutResults(store));
  const [text, setText] = useState("");
  const [now, setNow] = useState(() => clock.now());
  const latest = useRef(current);
  const inputRef = useRef<HTMLInputElement>(null);

  const show = useCallback((next: Run) => {
    latest.current = next;
    setCurrent(next);
  }, []);

  const apply = useCallback(
    (round: GdbOutRound) => {
      const run = latest.current;
      if (round === run.round) return;
      if (!isGdbOutRoundFinished(run.round) && isGdbOutRoundFinished(round)) {
        const stats = gdbOutRoundStats(round);
        const at = clock.wallTime();
        appendGdbOutResult(store, {
          version: 1,
          durationS: round.config.durationMs / 1000,
          level: round.config.level,
          seed: round.config.seed,
          correct: stats.correct,
          wrong: stats.wrong,
          skipped: stats.skipped,
          finishedAt: at,
        });
        recordEvents(store, gdbOutputEvents(round, at), at);
        setResults(loadGdbOutResults(store));
      }
      show({ ...run, round });
    },
    [clock, show, store],
  );

  const { settings, round } = current;
  const finished = isGdbOutRoundFinished(round);
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
      apply(tickGdbOutRound(latest.current.round, t));
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
    const updated = parseGdbOutSettings({ ...latest.current.settings, ...patch });
    saveGdbOutSettings(store, updated);
    restart(updated);
  };

  const toggleKind = (kind: GdbOutKind, on: boolean) => {
    change({
      kinds: GDB_OUT_KINDS.filter((k) =>
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
    apply(submitGdbOutput(cur, trimmed, t));
  };

  const historyScores = useMemo(
    () =>
      results
        .filter((r) => r.durationS === settings.durationS && r.level === settings.level)
        .map((r) => r.correct),
    [results, settings.durationS, settings.level],
  );

  const remainingS = Math.ceil(
    gdbOutRemainingMs(round, Math.max(now, round.startedAt ?? now)) / 1000,
  );
  const correctCount = round.results.filter((r) => r.ok).length;
  const stats = useMemo(() => (finished ? gdbOutRoundStats(round) : null), [finished, round]);
  const best = historyScores.length > 0 ? Math.max(...historyScores) : correctCount;

  const currentItem = round.current;
  const sessionLines = useMemo(() => {
    const lines = [`Breakpoint 1, main () at ${currentItem.file}:${String(currentItem.stopLine)}`];
    if (currentItem.locals.length > 0) {
      lines.push(`Locais: ${currentItem.locals.map((l) => `${l.name} = ${l.value}`).join(" · ")}`);
    }
    lines.push(`(gdb) ${currentItem.command}`);
    return lines;
  }, [currentItem]);

  const formatRefList = useMemo(
    () => (
      <ul>
        {OUTPUT_FORMAT_TABLE.map((entry) => {
          const lesson = gdbLessonForOutputKey(entry.key);
          return (
            <li key={entry.key}>
              <code>{entry.syntax}</code> — {entry.text}
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

  const prefixLabel = round.current.commandKind === "print" ? "$1 =" : ">";
  const placeholder =
    round.current.commandKind === "examine"
      ? "ex.: 0x02 0x01 0x00 0x00"
      : round.current.commandKind === "whatis"
        ? "ex.: type = int *"
        : "ex.: 0xffffffff";

  return (
    <div className="screen gdb">
      <PanelTitle title="Saída">
        Digite o que o gdb imprime para o comando no ponto de parada (sem precisar do $N =; use ADDR
        onde aparecer endereço).
      </PanelTitle>

      <div className="vim-options-block" data-panel="options">
        <div className="vim-options" role="group" aria-label="Opções">
          <label htmlFor="gdb-out-duration">Duração</label>
          <select
            id="gdb-out-duration"
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

          <label htmlFor="gdb-out-level">Nível</label>
          <select
            id="gdb-out-level"
            value={settings.level}
            onChange={(e) => {
              change({ level: Number(e.target.value) });
            }}
          >
            {GDB_OUT_LEVELS.map((lv) => (
              <option key={lv} value={lv}>
                {`Nível ${String(lv)}`}
              </option>
            ))}
          </select>
        </div>

        <details className="vim-kinds-details" data-testid="gdb-out-kinds-details">
          <summary>Tipos de saída</summary>
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
                        {GDB_OUT_KIND_LABELS[kind]}
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
            headlineTestId="gdb-out-final-score"
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
                  data-testid="gdb-out-kind-table"
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
                        <td data-label="Tipo">{GDB_OUT_KIND_LABELS[row.kind]}</td>
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
                <div className="gdb-wrong-wrap" data-testid="gdb-out-wrong-list">
                  <h3>Saídas erradas</h3>
                  <ul className="vim-worst">
                    {stats.wrongItems.map((item) => (
                      <li key={item.index}>
                        <code>{item.command}</code> <span className="muted">você:</span>{" "}
                        <code>{item.typed}</code> <span className="muted">gdb:</span>{" "}
                        <code>{item.canonical}</code>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : undefined
            }
            seed={`seed ${String(round.config.seed)} · N${String(settings.level)}`}
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
                  testId: "gdb-out-time",
                  tone: remainingS <= 10 ? "warning" : "accent",
                },
                { label: "acertos", value: correctCount, testId: "gdb-out-score" },
              ]}
            />

            <p className="gdb-prompt gdb-out-cmd-line" data-testid="gdb-out-command">
              O que imprime <code>{`(gdb) ${round.current.command}`}</code>?
            </p>

            <CodeView
              file={round.current.file}
              lines={round.current.lines}
              currentLine={round.current.stopLine}
              breakpoints={[{ id: 1, line: round.current.stopLine, enabled: true }]}
              sessionLines={sessionLines}
              codeTestId="gdb-out-code"
              sessionTestId="gdb-out-session"
            />

            <form
              className="gdb-input-row"
              onSubmit={(e) => {
                e.preventDefault();
                submitCurrent();
              }}
            >
              <span className="gdb-prompt-prefix" aria-hidden="true">
                {prefixLabel}
              </span>
              <input
                ref={inputRef}
                type="text"
                className="gdb-input"
                aria-label="Saída do gdb"
                placeholder={placeholder}
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
                    apply(touchGdbOutRound(latest.current.round, t));
                  }
                }}
                onKeyDown={(e) => {
                  const action = matchTrainingKey(e);
                  if (action === "skip") {
                    e.preventDefault();
                    const t = clock.now();
                    setNow(t);
                    setText("");
                    apply(skipGdbOutItem(latest.current.round, t));
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
                data-testid="gdb-out-feedback"
                data-outcome={round.last.skipped ? "skipped" : round.last.ok ? "correct" : "wrong"}
              >
                {round.last.ok ? (
                  <>
                    Correto: <code>{round.last.typed}</code>
                  </>
                ) : round.last.skipped ? (
                  <>
                    Pulado. Saída: <code>{round.last.canonical}</code> — {round.last.reason}
                  </>
                ) : (
                  <>
                    Saída real: <code>{round.last.canonical}</code> — {round.last.reason}
                  </>
                )}
              </p>
            )}
          </>
        )}
      </div>

      <RoundHistory scores={historyScores} unit="acertos" testId="gdb-out-summary" />

      <Reference id="gdb-out-formats" title="Formatos" className="vim-commands">
        {formatRefList}
      </Reference>

      <div className="actions">
        <button type="button" onClick={onBack}>
          Voltar
        </button>
      </div>
    </div>
  );
}
