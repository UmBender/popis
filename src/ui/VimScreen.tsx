import {
  Fragment,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Clock } from "../core/clock";
import { motionEvents } from "../stats/derive";
import { loadEvents, recordEvents } from "../storage/events";
import type { KeyValueStore } from "../storage/history";
import {
  appendVimResult,
  assistedRoundCount,
  defaultPreviewMode,
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
import { formatKeys, keyFromEvent, parseKeys, type Key } from "../vim/keys";
import { LEVEL_LABELS, LEVELS, levelHelp } from "../vim/levels";
import { recalculateOptimal } from "../vim/optimal";
import {
  assistedSplit,
  eventsToSamples,
  motionWaypoints,
  parseSolutionBlocks,
  PREVIEW_MODE_LABELS,
  PREVIEW_MODES,
  shouldShowPreview,
  type CommandSample,
  type PreviewMode,
} from "../vim/preview";
import {
  idleMs,
  isRoundFinished,
  markAssisted,
  pauseRound,
  pressRoundKey,
  remainingMs,
  resumeRound,
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
import { LessonModal, OptimalPreview } from "./vim/Preview";

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

type PreviewPlan = {
  readonly solution: string;
  readonly keys: readonly Key[];
  readonly matchedKeys: number;
  readonly peeked: boolean;
  readonly dirty: boolean;
};

function initialPlan(solution: string): PreviewPlan {
  return { solution, keys: parseKeys(solution), matchedKeys: 0, peeked: false, dirty: false };
}

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
  const [defaultPreview] = useState<PreviewMode>(() => defaultPreviewMode(store));
  const [now, setNow] = useState(() => clock.now());
  const [cmdline, setCmdline] = useState<string | null>(null);
  const [plan, setPlan] = useState<PreviewPlan>(() => initialPlan(current.round.target.solution));
  const [openLessonId, setOpenLessonId] = useState<string | null>(null);
  // The latest run, cmdline and plan, read by event handlers between renders.
  const latest = useRef(current);
  const cmdlineRef = useRef(cmdline);
  const planRef = useRef(plan);
  const box = useRef<HTMLTextAreaElement>(null);

  const storedSamples = useMemo(
    () => eventsToSamples(loadEvents(store), "vim.motion"),
    [store, results],
  );
  const storedSamplesRef = useRef(storedSamples);
  storedSamplesRef.current = storedSamples;

  const updateCmdline = (next: string | null) => {
    cmdlineRef.current = next;
    setCmdline(next);
  };

  const updatePlan = useCallback((next: PreviewPlan) => {
    planRef.current = next;
    setPlan(next);
  }, []);

  const show = useCallback((next: Run) => {
    latest.current = next;
    setCurrent(next);
  }, []);

  const previewModeOf = useCallback(
    (s: VimSettings): PreviewMode => s.preview ?? defaultPreview,
    [defaultPreview],
  );

  const samplesFor = useCallback(
    (round: Round): readonly CommandSample[] => [
      ...storedSamplesRef.current,
      ...round.results.map((r) => ({ solution: r.solution, efficiency: targetEfficiency(r) })),
    ],
    [],
  );

  const isPreviewVisible = useCallback(
    (round: Round, s: VimSettings, p: PreviewPlan, at: number): boolean =>
      shouldShowPreview({
        mode: previewModeOf(s),
        solution: round.target.solution,
        minimum: round.target.minimum,
        keysTyped: round.keys,
        idleMs: idleMs(round, at),
        peeked: p.peeked,
        history: samplesFor(round),
      }),
    [previewModeOf, samplesFor],
  );

  const apply = useCallback(
    (round: Round) => {
      const run = latest.current;
      if (round === run.round) return;
      if (!isRoundFinished(run.round) && isRoundFinished(round)) {
        const stats = roundStats(round);
        const split = assistedSplit(round.results);
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
          assisted: split.anyAssisted,
        });
        recordEvents(store, motionEvents(round, at), at);
        setResults(loadVimResults(store));
      }
      show({ ...run, round });
    },
    [clock, show, store],
  );

  const { settings, round } = current;
  const previewMode = previewModeOf(settings);
  const finished = isRoundFinished(round);
  const paused = round.pausedAt !== null;
  const running = round.startedAt !== null && !finished && !paused;
  useRunning(onRunning, running || paused);

  useEffect(() => {
    box.current?.focus();
  }, [current.run]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const t = clock.now();
      setNow(t);
      const run = latest.current;
      let next = tickRound(run.round, t);
      if (!next.finished && isPreviewVisible(next, run.settings, planRef.current, t)) {
        if (planRef.current.dirty) {
          const recalc = recalculateOptimal(next.vim, next.target.target, next.config.level);
          updatePlan({
            solution: recalc.keys,
            keys: parseKeys(recalc.keys),
            matchedKeys: 0,
            peeked: planRef.current.peeked,
            dirty: false,
          });
        }
        next = markAssisted(next);
      }
      apply(next);
    }, TICK_MS);
    return () => {
      clearInterval(id);
    };
  }, [apply, clock, isPreviewVisible, running, updatePlan]);

  const resetRun = (next: Run) => {
    setOpenLessonId(null);
    updateCmdline(null);
    updatePlan(initialPlan(next.round.target.solution));
    show(next);
  };

  const exit = () => {
    const run = latest.current;
    resetRun(newRun(run.settings, run.round.config.seed, run.run));
    box.current?.blur();
  };

  const feed = (key: Key) => {
    const run = latest.current;
    if (run.round.pausedAt !== null || run.round.finished) return;
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
    if (key === ":" && run.round.vim.pending.length === 0) {
      updateCmdline("");
      return;
    }
    const t = clock.now();
    const curPlan = planRef.current;
    const visibleBefore = isPreviewVisible(run.round, run.settings, curPlan, t);
    const prepared = visibleBefore ? markAssisted(run.round) : run.round;
    let nextRound = pressRoundKey(prepared, key, t);
    if (nextRound.target.index !== run.round.target.index) {
      updatePlan(initialPlan(nextRound.target.solution));
      apply(nextRound);
      return;
    }
    const onPath = !curPlan.dirty && key === curPlan.keys[curPlan.matchedKeys];
    const nextPlanBase: PreviewPlan = onPath
      ? { ...curPlan, matchedKeys: curPlan.matchedKeys + 1 }
      : { ...curPlan, dirty: true };
    const visibleAfter = isPreviewVisible(nextRound, run.settings, nextPlanBase, t);
    if (visibleAfter) {
      nextRound = markAssisted(nextRound);
      if (nextPlanBase.dirty) {
        const recalc = recalculateOptimal(
          nextRound.vim,
          nextRound.target.target,
          nextRound.config.level,
        );
        updatePlan({
          solution: recalc.keys,
          keys: parseKeys(recalc.keys),
          matchedKeys: 0,
          peeked: curPlan.peeked,
          dirty: false,
        });
      } else {
        updatePlan(nextPlanBase);
      }
    } else {
      updatePlan(nextPlanBase);
    }
    apply(nextRound);
  };

  const typed = (text: string) => {
    for (const ch of text.replace(/[\r\n]/g, "")) feed(ch);
  };

  const restart = (next = latest.current.settings) => {
    resetRun(newRun(next, newSeed(), latest.current.run + 1));
  };

  /** Applies an option from the form, validated like stored settings. */
  const change = (patch: Readonly<Record<string, unknown>>) => {
    const updated = parseVimSettings({ ...latest.current.settings, ...patch });
    saveVimSettings(store, updated);
    restart(updated);
  };

  const peek = () => {
    const run = latest.current;
    if (run.round.finished || run.round.pausedAt !== null) return;
    const cur = planRef.current;
    if (cur.dirty) {
      const recalc = recalculateOptimal(
        run.round.vim,
        run.round.target.target,
        run.round.config.level,
      );
      updatePlan({
        solution: recalc.keys,
        keys: parseKeys(recalc.keys),
        matchedKeys: 0,
        peeked: true,
        dirty: false,
      });
    } else {
      updatePlan({ ...cur, peeked: true });
    }
    apply(markAssisted(run.round));
  };

  const openLesson = useCallback(
    (lessonId: string) => {
      setOpenLessonId(lessonId);
      apply(pauseRound(latest.current.round, clock.now()));
    },
    [apply, clock],
  );

  const closeLesson = useCallback(() => {
    setOpenLessonId(null);
    const t = clock.now();
    setNow(t);
    apply(resumeRound(latest.current.round, t));
    box.current?.focus();
  }, [apply, clock]);

  const historyScores = results
    .filter((r) => r.level === settings.level && r.durationS === settings.durationS && !r.assisted)
    .map((r) => r.reached);
  const excludedAssisted = assistedRoundCount(results, settings.level, settings.durationS);
  const { target, vim } = round;
  const remainingS = Math.ceil(remainingMs(round, Math.max(now, round.startedAt ?? now)) / 1000);
  const reached = round.results.filter((r) => !r.skipped).length;
  const allHelp = levelHelp(settings.level);
  const currentHelp = allHelp.filter((h) => h.level === settings.level);
  const earlierHelp = allHelp.filter((h) => h.level < settings.level);

  const previewVisible = !finished && isPreviewVisible(round, settings, plan, now);
  const previewBlocks = useMemo(
    () => (previewVisible ? parseSolutionBlocks(plan.solution) : []),
    [previewVisible, plan.solution],
  );
  const waypointsByLine = useMemo(() => {
    const map = new Map<number, Set<number>>();
    if (!previewVisible) return map;
    const startIdx = previewBlocks.findIndex((b) => b.endKeyIndex > plan.matchedKeys);
    if (startIdx < 0) return map;
    for (const pos of motionWaypoints(vim, previewBlocks, startIdx, target.target, settings.level)) {
      let cols = map.get(pos.line);
      if (cols === undefined) {
        cols = new Set<number>();
        map.set(pos.line, cols);
      }
      cols.add(pos.col);
    }
    return map;
  }, [previewVisible, previewBlocks, plan.matchedKeys, vim, target.target, settings.level]);

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
        <label htmlFor="vim-preview-mode">Prévia do ótimo</label>
        <select
          id="vim-preview-mode"
          value={previewMode}
          onChange={(e) => {
            change({ preview: e.target.value });
          }}
        >
          {PREVIEW_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {PREVIEW_MODE_LABELS[mode]}
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
            if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "p") {
              e.preventDefault();
              peek();
              return;
            }
            const action = matchTrainingKey(e, { vim: true });
            if (action === "skip") {
              e.preventDefault();
              const run = latest.current;
              const t = clock.now();
              const base = isPreviewVisible(run.round, run.settings, planRef.current, t)
                ? markAssisted(run.round)
                : run.round;
              const next = skipTarget(base, t);
              if (next.target.index !== run.round.target.index) {
                updatePlan(initialPlan(next.target.solution));
              }
              apply(next);
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
            {previewVisible && (
              <OptimalPreview
                blocks={previewBlocks}
                matchedKeys={plan.matchedKeys}
                onOpenLesson={openLesson}
              />
            )}
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
                    waypoints={waypointsByLine.get(line)}
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

      <RoundHistory
        scores={historyScores}
        excluded={excludedAssisted}
        unit="alvos"
        testId="vim-summary"
      />

      <Reference id="vim-motion-commands" title="Comandos deste nível" className="vim-commands">
        <ul>
          {currentHelp.map((help) => (
            <MotionHelpItem key={help.keys} help={help} onLearn={onLearn} />
          ))}
        </ul>
        {earlierHelp.length > 0 && (
          <details className="vim-earlier" data-testid="vim-earlier-commands">
            <summary>{`já valem (níveis 1–${String(settings.level - 1)})`}</summary>
            <ul>
              {earlierHelp.map((help) => (
                <MotionHelpItem key={help.keys} help={help} onLearn={onLearn} />
              ))}
            </ul>
          </details>
        )}
      </Reference>

      <div className="actions">
        <button type="button" onClick={onBack}>
          Voltar
        </button>
      </div>

      {openLessonId !== null && <LessonModal lessonId={openLessonId} onClose={closeLesson} />}
    </div>
  );
}

function MotionHelpItem({
  help,
  onLearn,
}: {
  readonly help: { readonly keys: string; readonly text: string };
  readonly onLearn?: (lessonId?: string) => void;
}): ReactNode {
  const lesson = lessonForHelpKey(help.keys);
  return (
    <li>
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
  const split = assistedSplit(round.results);
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
        { label: "sem prévia", value: split.withoutPreview, testId: "vim-without-preview" },
        { label: "com prévia", value: split.withPreview, testId: "vim-with-preview" },
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
  waypoints,
  solution,
  minimum,
}: {
  readonly text: string;
  readonly line: number;
  /** Column of the cursor on this line, or -1. */
  readonly cursor: number;
  /** Column of the target on this line, or -1. */
  readonly target: number;
  /** Intermediate path columns on this line, or undefined. */
  readonly waypoints?: ReadonlySet<number>;
  readonly solution: string;
  readonly minimum: number;
}): ReactNode {
  if (cursor < 0 && target < 0 && (waypoints === undefined || waypoints.size === 0)) return text;
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
        if (waypoints?.has(col) === true) {
          return (
            <span
              key={col}
              className="vim-waypoint"
              data-testid="vim-waypoint"
              data-line={line}
              data-col={col}
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
