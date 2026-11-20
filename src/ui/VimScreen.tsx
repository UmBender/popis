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
  vimSummary,
  type VimDrill,
  type VimEditSettings,
  type VimResult,
  type VimSettings,
} from "../storage/vim";
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
import { DrillSelect } from "./vim/DrillSelect";
import { EditDrill } from "./vim/EditDrill";
import { LearnDrill } from "./vim/LearnDrill";

type Props = {
  readonly clock: Clock;
  readonly store: KeyValueStore;
  /** Seed of each new round. */
  readonly newSeed: () => number;
  readonly onBack: () => void;
};

/** The Vim screen: the motion drill (T13) or the edit drill (T14), as chosen. */
export function VimScreen(props: Props): ReactNode {
  const { store } = props;
  const [edit, setEdit] = useState<VimEditSettings>(() => loadVimEditSettings(store));
  if (edit.drill === "edit") {
    return <EditDrill {...props} settings={edit} onSettings={setEdit} />;
  }
  if (edit.drill === "learn") {
    return <LearnDrill {...props} settings={edit} onSettings={setEdit} />;
  }
  return (
    <MotionDrill
      {...props}
      onDrill={(drill) => {
        const updated = parseVimEditSettings({ ...edit, drill });
        saveVimEditSettings(store, updated);
        setEdit(updated);
      }}
    />
  );
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
function MotionDrill({
  clock,
  store,
  newSeed,
  onBack,
  onDrill,
}: Props & { readonly onDrill: (drill: VimDrill) => void }): ReactNode {
  const [current, setCurrent] = useState<Run>(() => newRun(loadVimSettings(store), newSeed(), 0));
  const [results, setResults] = useState<readonly VimResult[]>(() => loadVimResults(store));
  const [now, setNow] = useState(() => clock.now());
  // The latest run, read by the event handlers between renders.
  const latest = useRef(current);
  const box = useRef<HTMLTextAreaElement>(null);

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

  const feed = (key: Key) => {
    apply(pressRoundKey(latest.current.round, key, clock.now()));
  };

  const typed = (text: string) => {
    for (const ch of text.replace(/[\r\n]/g, "")) feed(ch);
  };

  const restart = (next = latest.current.settings) => {
    show(newRun(next, newSeed(), latest.current.run + 1));
  };

  /** Applies an option from the form, validated like stored settings. */
  const change = (patch: Readonly<Record<string, unknown>>) => {
    const updated = parseVimSettings({ ...latest.current.settings, ...patch });
    saveVimSettings(store, updated);
    restart(updated);
  };

  const summary = vimSummary(results, settings.level, settings.durationS);
  const { target, vim } = round;
  const remainingS = Math.ceil(remainingMs(round, Math.max(now, round.startedAt ?? now)) / 1000);

  return (
    <div className="screen vim">
      <h1>Vim</h1>

      <div className="typing-area">
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
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              apply(skipTarget(latest.current.round, clock.now()));
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
            <p className="vim-time" data-testid="vim-time">
              {remainingS}
            </p>
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
              <strong>NORMAL</strong> <span className="vim-pending">{formatKeys(vim.pending)}</span>
            </p>
            {round.blocked !== null && (
              <p className="vim-blocked" data-testid="vim-blocked">
                bloqueado neste nível: <code>{round.blocked}</code>
              </p>
            )}
            {round.last !== null && <LastTarget result={round.last} />}
            <p className="muted hint">Ctrl+Enter pula o alvo · Esc cancela o comando.</p>
          </>
        )}
      </div>

      <fieldset className="vim-options">
        <legend>Opções</legend>
        <DrillSelect value="motion" onChange={onDrill} />
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
      </fieldset>

      <fieldset className="vim-commands">
        <legend>Comandos deste nível</legend>
        <ul>
          {levelHelp(settings.level).map((help) => (
            <li key={help.keys}>
              <code>{help.keys}</code> — {help.text}
            </li>
          ))}
        </ul>
      </fieldset>

      <p data-testid="vim-summary" className="muted typing-summary">
        {summary === null
          ? "Sem resultados nesta configuração."
          : `melhor ${String(Math.round(summary.best))} alvos · ` +
            `média dos últimos 10: ${String(Math.round(summary.recentMean))} alvos`}
      </p>

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
    <div className="typing-results">
      <p className="score">
        <strong data-testid="vim-reached">{stats.reached}</strong> alvos · pulados{" "}
        <span data-testid="vim-skipped">{stats.skipped}</span> · eficiência média{" "}
        <span data-testid="vim-efficiency">{percent(stats.efficiency)}</span>
      </p>
      <ul className="vim-worst" data-testid="vim-worst">
        {stats.worst.map((result) => (
          <li key={result.index}>
            <Comparison result={result} /> · {percent(targetEfficiency(result))}
          </li>
        ))}
      </ul>
      <p className="seed">
        <span data-testid="vim-config">
          {`nível ${String(settings.level)} · ${String(settings.durationS)} s`}
        </span>{" "}
        · seed <span data-testid="vim-seed">{round.config.seed}</span>
      </p>
      <button type="button" className="primary" autoFocus onClick={onNext}>
        Próximo
      </button>
    </div>
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
