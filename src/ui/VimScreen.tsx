import { Fragment, memo, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { Clock } from "../core/clock";
import { motionEvents } from "../stats/derive";
import { recordEvents } from "../storage/events";
import type { KeyValueStore } from "../storage/history";
import {
  appendVimResult,
  loadVimEditSettings,
  loadVimResults,
  loadVimSettings,
  parseVimEditSettings,
  parseVimSettings,
  saveVimEditSettings,
  saveVimSettings,
  type VimDrill,
  type VimEditSettings,
  type VimResult,
  type VimSettings,
} from "../storage/vim";
import { lessonForHelpKey } from "../vim/curriculum";
import { formatKeys, keyFromEvent, type Key } from "../vim/keys";
import { LEVEL_LABELS, LEVELS, levelHelp } from "../vim/levels";
import {
  isRoundFinished,
  pressRoundKey,
  remainingMs,
  ROUND_DURATIONS_S,
  roundStats,
  skipTarget,
  startRound,
  targetEfficiency,
  tickRound,
  type Round,
  type TargetResult,
} from "../vim/round";
import { matchTrainingKey } from "./keys";
import { RoundHistory } from "./shell/History";
import { PanelTitle, Reference, useRunning } from "./shell/panel";
import { Result } from "./shell/Result";
import { RoundBar } from "./shell/RoundBar";
import { EditDrill } from "./vim/EditDrill";
import { LearnDrill } from "./vim/LearnDrill";

type Props = {
  readonly clock: Clock;
  readonly store: KeyValueStore;
  /** Seed of each new round. */
  readonly newSeed: () => number;
  readonly onBack: () => void;
  /** Told when a round starts and ends, so the window hides the tree (T18). */
  readonly onRunning?: (running: boolean) => void;
  /** Switches to the Vim Learn screen (T19 AC-7, T20 AC-5). */
  readonly onLearn?: (lessonId?: string) => void;
  /** Switches to Motion or Edit from a completed Learn lesson (T20 AC-5). */
  readonly onPractice?: (drill: "motion" | "edit") => void;
  /** Lesson to open immediately when entering Learn (T20 AC-5). */
  readonly initialLesson?: string | null;
  /** Read-only Learn mode on touch screens (T20 AC-6). */
  readonly readOnly?: boolean;
};

/**
 * The Vim screen: the motion drill (T13), the edit drill (T14) or Learn, as
 * saved; the window's tree saves the choice (T18).
 */
export function VimScreen(props: Props): ReactNode {
  const { store } = props;
  const [edit, setEdit] = useState<VimEditSettings>(() => loadVimEditSettings(store));
  if (edit.drill === "edit") {
    return <EditDrill {...props} settings={edit} onSettings={setEdit} />;
  }
  if (edit.drill === "learn") {
    return <LearnDrill {...props} settings={edit} onSettings={setEdit} />;
  }
  return <MotionDrill {...props} />;
}

/** Saves the drill chosen in the tree, for the next VimScreen. */
export function chooseVimDrill(store: KeyValueStore, drill: VimDrill): void {
  saveVimEditSettings(store, parseVimEditSettings({ ...loadVimEditSettings(store), drill }));
}

const TICK_MS = 100;

/** One round being played. `run` changes on every new round, to refocus the box. */
type Run = {
  readonly settings: VimSettings;
  readonly round: Round;
  readonly run: number;
};

function newRun(settings: VimSettings, seed: number, run: number): Run {
  const round = startRound({
    level: settings.level,
    durationMs: settings.durationS * 1000,
    seed,
  });
  return { settings, round, run };
}

const percent = (fraction: number): string => `${String(Math.round(fraction * 100))}%`;

/** The Vim motion drill (ADR-T13-1). */
function MotionDrill({ clock, store, newSeed, onBack, onRunning, onLearn }: Props): ReactNode {
  const [current, setCurrent] = useState<Run>(() => newRun(loadVimSettings(store), newSeed(), 0));
  const [results, setResults] = useState<readonly VimResult[]>(() => loadVimResults(store));
  const [now, setNow] = useState(() => clock.now());
  const [cmdline, setCmdline] = useState<string | null>(null);
  // The latest run and cmdline, read by the event handlers between renders.
  const latest = useRef(current);
  const cmdlineRef = useRef(cmdline);
  const box = useRef<HTMLTextAreaElement>(null);

  const updateCmdline = (next: string | null) => {
    cmdlineRef.current = next;
    setCmdline(next);
  };

  const show = useCallback((next: Run) => {
    latest.current = next;
    setCurrent(next);
  }, []);

  const apply = useCallback(
    (round: Round) => {
      const run = latest.current;
      if (round === run.round) return;
      if (!isRoundFinished(run.round) && isRoundFinished(round)) {
        const stats = roundStats(round);
        const at = clock.wallTime();
        appendVimResult(store, {
          version: 1,
          level: round.config.level,
          durationS: round.config.durationMs / 1000,
          seed: round.config.seed,
          reached: stats.reached,
          skipped: stats.skipped,
          efficiency: stats.efficiency,
          finishedAt: at,
        });
        recordEvents(store, motionEvents(round, at), at);
        setResults(loadVimResults(store));
      }
      show({ ...run, round });
    },
    [clock, show, store],
  );

  const { settings, round } = current;
  const finished = isRoundFinished(round);
  const running = round.startedAt !== null && !finished;
  useRunning(onRunning, running);

  useEffect(() => {
    box.current?.focus();
  }, [current.run]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const t = clock.now();
      setNow(t);
      apply(tickRound(latest.current.round, t));
    }, TICK_MS);
    return () => {
      clearInterval(id);
    };
  }, [apply, clock, running]);

  const exit = () => {
    updateCmdline(null);
    const run = latest.current;
    show(newRun(run.settings, run.round.config.seed, run.run));
    box.current?.blur();
  };

  const feed = (key: Key) => {
    const cmd = cmdlineRef.current;
    if (cmd !== null) {
      if (key === "<Esc>") {
        updateCmdline(null);
      } else if (key === "<CR>") {
        if (cmd.trim() === "q") exit();
        else updateCmdline(null);
      } else if (key === "<BS>") {
        updateCmdline(cmd.length === 0 ? null : cmd.slice(0, -1));
      } else if (key.length === 1) {
        updateCmdline(cmd + key);
      }
      return;
    }
    if (key === ":" && latest.current.round.vim.pending.length === 0) {
      updateCmdline("");
      return;
    }
    apply(pressRoundKey(latest.current.round, key, clock.now()));
  };

  const typed = (text: string) => {
    for (const ch of text.replace(/[\r\n]/g, "")) feed(ch);
  };

  const restart = (next = latest.current.settings) => {
    updateCmdline(null);
    show(newRun(next, newSeed(), latest.current.run + 1));
  };

  /** Applies an option from the form, validated like stored settings. */
  const change = (patch: Readonly<Record<string, unknown>>) => {
    const updated = parseVimSettings({ ...latest.current.settings, ...patch });
    saveVimSettings(store, updated);
    restart(updated);
  };

  const historyScores = results
    .filter((r) => r.level === settings.level && r.durationS === settings.durationS)
    .map((r) => r.reached);
  const { target, vim } = round;
  const remainingS = Math.ceil(remainingMs(round, Math.max(now, round.startedAt ?? now)) / 1000);
  const reached = round.results.filter((r) => !r.skipped).length;
  const allHelp = levelHelp(settings.level);
  const currentHelp = allHelp.filter((h) => h.level === settings.level);
  const earlierHelp = allHelp.filter((h) => h.level < settings.level);

  return (
    <div className="screen vim">
      <PanelTitle title="Movimento">Leve o cursor até o alvo com o mínimo de teclas.</PanelTitle>

      <div className="vim-options" data-panel="options" role="group" aria-label="Opções">
        <label htmlFor="vim-level">Nível</label>
        <select
          id="vim-level"
          value={settings.level}
          onChange={(e) => {
            change({ level: Number(e.target.value) });
          }}
        >
          {LEVELS.map((level) => (
            <option key={level} value={level}>
              {`${String(level)}: ${LEVEL_LABELS[level]}`}
            </option>
          ))}
        </select>
        <label htmlFor="vim-duration">Duração</label>
        <select
          id="vim-duration"
          value={settings.durationS}
          onChange={(e) => {
            change({ durationS: Number(e.target.value) });
          }}
        >
          {ROUND_DURATIONS_S.map((s) => (
            <option key={s} value={s}>
              {`${String(s)} s`}
            </option>
          ))}
        </select>
      </div>

      <div className="typing-area" data-panel="area">
        <textarea
          ref={box}
          className="typing-input"
          aria-label="Teclas do Vim"
          autoFocus
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          onChange={(e) => {
            // Dead keys compose first; their text arrives at compositionend.
            if ((e.nativeEvent as InputEvent).isComposing) return;
            const text = e.target.value;
            e.target.value = "";
            typed(text);
          }}
          onCompositionEnd={(e) => {
            const text = e.currentTarget.value;
            e.currentTarget.value = "";
            typed(text);
          }}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing) return;
            const action = matchTrainingKey(e, { vim: true });
            if (action === "skip") {
              e.preventDefault();
              apply(skipTarget(latest.current.round, clock.now()));
              return;
            }
            if (action === "restart") {
              e.preventDefault();
              restart();
              return;
            }
            const key = keyFromEvent(e);
            // Dead keys have no Vim key: they must reach the composition.
            if (key === null) return;
            e.preventDefault();
            feed(key);
          }}
        />

        {finished ? (
          <VimResults
            round={round}
            settings={settings}
            onNext={() => {
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
                  testId: "vim-time",
                  tone: "accent",
                },
                { label: "alvos", value: reached },
              ]}
            />
            <pre
              className="vim-code"
              data-testid="vim-code"
              data-target-index={target.index}
              onClick={() => {
                box.current?.focus();
              }}
            >
              {target.lines.map((text, line) => (
                <Fragment key={line}>
                  {line > 0 ? "\n" : null}
                  <Line
                    text={text}
                    line={line}
                    cursor={vim.cursor.line === line ? vim.cursor.col : -1}
                    target={target.target.line === line ? target.target.col : -1}
                    solution={target.solution}
                    minimum={target.minimum}
                  />
                </Fragment>
              ))}
            </pre>
            <p className="vim-status" data-testid="vim-status">
              {cmdline !== null ? (
                <span className="vim-pending">{`:${cmdline}`}</span>
              ) : (
                <>
                  <strong>NORMAL</strong>{" "}
                  <span className="vim-pending">{formatKeys(vim.pending)}</span>
                </>
              )}
            </p>
            {round.blocked !== null && (
              <p className="vim-blocked" data-testid="vim-blocked">
                bloqueado neste nível: <code>{round.blocked}</code>
              </p>
            )}
            {round.last !== null && <LastTarget result={round.last} />}
          </>
        )}
      </div>

      <RoundHistory scores={historyScores} unit="alvos" testId="vim-summary" />

      <Reference id="vim-motion-commands" title="Comandos deste nível" className="vim-commands">
        <ul>
          {currentHelp.map((help) => {
            const lesson = lessonForHelpKey(help.keys);
            return (
              <li key={help.keys}>
                <code>{help.keys}</code> — {help.text}
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
        {earlierHelp.length > 0 && (
          <details className="vim-earlier" data-testid="vim-earlier-commands">
            <summary>{`já valem (níveis 1–${String(settings.level - 1)})`}</summary>
            <ul>
              {earlierHelp.map((help) => {
                const lesson = lessonForHelpKey(help.keys);
                return (
                  <li key={help.keys}>
                    <code>{help.keys}</code> — {help.text}
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
          </details>
        )}
      </Reference>

      <div className="actions">
        <button type="button" onClick={onBack}>
          Voltar
        </button>
      </div>
    </div>
  );
}

/** "você: 7 teclas · ótimo: 2 (f()". */
function Comparison({ result }: { readonly result: TargetResult }): ReactNode {
  return (
    <>
      {result.skipped ? "pulado" : `você: ${String(result.keys)} teclas`} · ótimo: {result.minimum}{" "}
      (<code>{result.solution}</code>)
    </>
  );
}

function LastTarget({ result }: { readonly result: TargetResult }): ReactNode {
  return (
    <p className="vim-last" data-testid="vim-last">
      <Comparison result={result} />
    </p>
  );
}

function VimResults({
  round,
  settings,
  onNext,
}: {
  readonly round: Round;
  readonly settings: VimSettings;
  readonly onNext: () => void;
}): ReactNode {
  const stats = roundStats(round);
  return (
    <Result
      headline={
        <>
          <strong data-testid="vim-reached">{stats.reached}</strong> alvos
        </>
      }
      pairs={[
        { label: "pulados", value: stats.skipped, testId: "vim-skipped" },
        { label: "eficiência média", value: percent(stats.efficiency), testId: "vim-efficiency" },
      ]}
      worst={
        <ul className="vim-worst" data-testid="vim-worst">
          {stats.worst.map((result) => (
            <li key={result.index}>
              <Comparison result={result} /> · {percent(targetEfficiency(result))}
            </li>
          ))}
        </ul>
      }
      seed={
        <>
          <span data-testid="vim-config">
            {`nível ${String(settings.level)} · ${String(settings.durationS)} s`}
          </span>{" "}
          · seed <span data-testid="vim-seed">{round.config.seed}</span>
        </>
      }
      onPlayAgain={onNext}
    />
  );
}

/**
 * One line of the snippet. Memoized on plain values: a key moves the cursor
 * on one or two lines, so the others skip rendering.
 */
const Line = memo(function Line({
  text,
  line,
  cursor,
  target,
  solution,
  minimum,
}: {
  readonly text: string;
  readonly line: number;
  /** Column of the cursor on this line, or -1. */
  readonly cursor: number;
  /** Column of the target on this line, or -1. */
  readonly target: number;
  readonly solution: string;
  readonly minimum: number;
}): ReactNode {
  if (cursor < 0 && target < 0) return text;
  return (
    <>
      {[...text].map((ch, col) => {
        if (col === cursor) {
          return (
            <span
              key={col}
              className="vim-cursor"
              data-testid="vim-cursor"
              data-line={line}
              data-col={col}
            >
              {ch}
            </span>
          );
        }
        if (col === target) {
          return (
            <span
              key={col}
              className="vim-target"
              data-testid="vim-target"
              data-line={line}
              data-col={col}
              data-solution={solution}
              data-minimum={minimum}
            >
              {ch}
            </span>
          );
        }
        return ch;
      })}
    </>
  );
});
