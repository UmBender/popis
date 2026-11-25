import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Clock } from "../core/clock";
import { STL_LEVEL_LABELS, STL_LEVELS, STL_MODEL_LABELS } from "../stl/drill";
import {
  isStlRoundFinished,
  skipStlItem,
  startStlRound,
  STL_DURATIONS_S,
  stlOutputEvents,
  stlRemainingMs,
  stlRoundStats,
  submitStlAnswer,
  tickStlRound,
  touchStlRound,
  type StlRound,
} from "../stl/round";
import { recordEvents } from "../storage/events";
import type { KeyValueStore } from "../storage/history";
import {
  appendStlResult,
  loadStlResults,
  loadStlSettings,
  parseStlSettings,
  saveStlSettings,
  type StlResult,
  type StlSettings,
} from "../storage/stl";
import { matchTrainingKey } from "./keys";
import { RoundHistory } from "./shell/History";
import { PanelTitle, Reference, useRunning } from "./shell/panel";
import { Result } from "./shell/Result";
import { RoundBar } from "./shell/RoundBar";

const TICK_MS = 100;

const STL_CHEATSHEET: readonly (readonly [string, string])[] = [
  ["lower_bound / upper_bound", "primeiro >= x / primeiro estritamente > x"],
  ["unique sem erase", "compacta só adjacentes e mantém v.size() inalterado"],
  ["multiset::erase(x)", "apaga todas as cópias; erase(find(x)) apaga só uma"],
  ["priority_queue<int>", "max-heap por padrão; use greater<int> para min-heap"],
  ["map[k]", "cria a chave k com valor 0 se não existir (aumenta size)"],
  ["size() / string::npos", "size_t de 64 bits sem sinal; npos = 2^64 - 1 = 18446744073709551615"],
  ["/ e % com negativos", "/ trunca em direção a zero; a % b tem o sinal de a"],
  ["__builtin_popcount / __lg", "quantidade de bits 1 / piso de log2(x)"],
  ["bitset<N>", "b[0] é o bit menos significativo (direita); impressão é MSB → LSB"],
  [
    "accumulate(..., init)",
    "o tipo de init define o acumulador (0 trunca para int; 0u faz wrap em 32 bits)",
  ],
];

export type StlScreenProps = {
  readonly clock: Clock;
  readonly store: KeyValueStore;
  readonly newSeed: () => number;
  readonly onBack: () => void;
  readonly onRunning?: (running: boolean) => void;
};

type Run = {
  readonly settings: StlSettings;
  readonly round: StlRound;
  readonly run: number;
};

function newRun(settings: StlSettings, seed: number, run: number): Run {
  return {
    settings,
    round: startStlRound({
      durationMs: settings.durationS * 1000,
      seed,
      level: settings.level,
    }),
    run,
  };
}

const formatSec = (ms: number): string => `${(ms / 1000).toFixed(1)} s`;

/** C++ and STL output prediction drill (T42 AC-5, ADR-T42-1). */
export function StlScreen({ clock, store, newSeed, onBack, onRunning }: StlScreenProps): ReactNode {
  const [current, setCurrent] = useState<Run>(() => newRun(loadStlSettings(store), newSeed(), 0));
  const [results, setResults] = useState<readonly StlResult[]>(() => loadStlResults(store));
  const [text, setText] = useState("");
  const [now, setNow] = useState(() => clock.now());
  const latest = useRef(current);
  const inputRef = useRef<HTMLInputElement>(null);

  const show = useCallback((next: Run) => {
    latest.current = next;
    setCurrent(next);
  }, []);

  const apply = useCallback(
    (round: StlRound) => {
      const run = latest.current;
      if (round === run.round) return;
      if (!isStlRoundFinished(run.round) && isStlRoundFinished(round)) {
        const stats = stlRoundStats(round);
        const at = clock.wallTime();
        appendStlResult(store, {
          version: 1,
          durationS: round.config.durationMs / 1000,
          level: round.config.level,
          seed: round.config.seed,
          correct: stats.correct,
          wrong: stats.wrong,
          skipped: stats.skipped,
          finishedAt: at,
        });
        recordEvents(store, stlOutputEvents(round, at), at);
        setResults(loadStlResults(store));
      }
      show({ ...run, round });
    },
    [clock, show, store],
  );

  const { settings, round } = current;
  const finished = isStlRoundFinished(round);
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
      apply(tickStlRound(latest.current.round, t));
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
    const updated = parseStlSettings({ ...latest.current.settings, ...patch });
    saveStlSettings(store, updated);
    restart(updated);
  };

  const submitCurrent = () => {
    const trimmed = text.trim();
    if (trimmed.length === 0) return;
    const t = clock.now();
    setNow(t);
    setText("");
    apply(submitStlAnswer(latest.current.round, trimmed, t));
  };

  const historyScores = useMemo(
    () =>
      results
        .filter((r) => r.durationS === settings.durationS && r.level === settings.level)
        .map((r) => r.correct),
    [results, settings.durationS, settings.level],
  );

  const remainingS = Math.ceil(stlRemainingMs(round, Math.max(now, round.startedAt ?? now)) / 1000);
  const correctCount = round.results.filter((r) => r.ok).length;
  const stats = useMemo(() => (finished ? stlRoundStats(round) : null), [finished, round]);
  const best = historyScores.length > 0 ? Math.max(...historyScores) : correctCount;

  return (
    <div className="screen stl">
      <PanelTitle title="STL">
        Leia o trecho de C++ (com <code>bits/stdc++.h</code> e <code>using namespace std;</code>) e
        digite o que ele imprime.
      </PanelTitle>

      <div className="vim-options-block" data-panel="options">
        <div className="vim-options" role="group" aria-label="Opções">
          <label htmlFor="stl-duration">Duração</label>
          <select
            id="stl-duration"
            value={settings.durationS}
            onChange={(e) => {
              change({ durationS: Number(e.target.value) });
            }}
          >
            {STL_DURATIONS_S.map((s) => (
              <option key={s} value={s}>
                {`${String(s)} s`}
              </option>
            ))}
          </select>

          <label htmlFor="stl-level">Nível</label>
          <select
            id="stl-level"
            value={settings.level}
            onChange={(e) => {
              change({ level: Number(e.target.value) });
            }}
          >
            {STL_LEVELS.map((lv) => (
              <option key={lv} value={lv}>
                {STL_LEVEL_LABELS[lv]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="gdb-area" data-panel="area">
        {finished && stats !== null ? (
          <Result
            headline={`${String(stats.correct)} ${stats.correct === 1 ? "acerto" : "acertos"} em ${String(settings.durationS)} s`}
            headlineTestId="stl-final-score"
            pairs={[
              { label: "erros", value: stats.wrong },
              { label: "puladas", value: stats.skipped },
              { label: "precisão", value: `${String(Math.round(stats.accuracy * 100))}%` },
              { label: "melhor", value: best },
            ]}
            extra={
              stats.byModel.length > 0 ? (
                <table
                  className="progress-table gdb-kind-table"
                  data-testid="stl-model-table"
                  aria-label="Desempenho por assunto"
                >
                  <thead>
                    <tr>
                      <th>Assunto</th>
                      <th>Acertos</th>
                      <th>Tempo médio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.byModel.map((row) => (
                      <tr key={row.model}>
                        <td data-label="Assunto">{STL_MODEL_LABELS[row.model]}</td>
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
                <div className="gdb-wrong-wrap" data-testid="stl-wrong-list">
                  <h3>Saídas erradas</h3>
                  <ul className="vim-worst">
                    {stats.wrongItems.map((item) => (
                      <li key={item.index}>
                        <strong>{STL_MODEL_LABELS[item.model]}</strong>{" "}
                        <span className="muted">você:</span> <code>{item.typed}</code>{" "}
                        <span className="muted">certo:</span> <code>{item.canonical}</code> —{" "}
                        {item.explanation}
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
                  testId: "stl-time",
                  tone: remainingS <= 10 ? "warning" : "accent",
                },
                { label: "acertos", value: correctCount, testId: "stl-score" },
              ]}
            />

            <p className="gdb-prompt">O que este trecho imprime?</p>

            <div className="gdb-viewer">
              <div className="gdb-file-bar">{`sol.cpp · ${STL_MODEL_LABELS[round.current.model]}`}</div>
              <pre className="gdb-code" data-testid="stl-code">
                {round.current.lines.map((line, idx) => (
                  <span key={idx} className="gdb-line">
                    <span className="gdb-gutter-num">{String(idx + 1).padStart(2, " ")}</span>{" "}
                    <span className="gdb-line-text">{line}</span>
                  </span>
                ))}
              </pre>
            </div>

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
                className="gdb-input"
                aria-label="Saída do programa"
                placeholder="ex.: 1 2 3"
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
                    apply(touchStlRound(latest.current.round, t));
                  }
                }}
                onKeyDown={(e) => {
                  const action = matchTrainingKey(e);
                  if (action === "skip") {
                    e.preventDefault();
                    const t = clock.now();
                    setNow(t);
                    setText("");
                    apply(skipStlItem(latest.current.round, t));
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
                data-testid="stl-feedback"
                data-outcome={round.last.skipped ? "skipped" : round.last.ok ? "correct" : "wrong"}
              >
                {round.last.ok ? (
                  <>
                    Correto: <code>{round.last.typed}</code>
                  </>
                ) : round.last.skipped ? (
                  <>
                    Pulado. Saída: <code>{round.last.canonical}</code> — {round.last.explanation}
                  </>
                ) : (
                  <>
                    Saída certa: <code>{round.last.canonical}</code> — {round.last.explanation}
                  </>
                )}
              </p>
            )}
          </>
        )}
      </div>

      <RoundHistory scores={historyScores} unit="acertos" testId="stl-summary" />

      <Reference id="stl-cheatsheet" title="Armadilhas comuns" className="vim-commands">
        <ul>
          {STL_CHEATSHEET.map(([topic, desc]) => (
            <li key={topic}>
              <code>{topic}</code> — {desc}
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
