import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Clock } from "../../core/clock";
import { editEvents } from "../../stats/derive";
import { loadEvents, recordEvents } from "../../storage/events";
import type { KeyValueStore } from "../../storage/history";
import {
  appendVimEditResult,
  assistedEditRoundCount,
  defaultPreviewMode,
  loadVimEditResults,
  parseVimEditSettings,
  saveVimEditSettings,
  type VimEditSettings,
} from "../../storage/vim";
import { loadUnlocked } from "../../storage/vim-learn";
import { lessonForHelpKey } from "../../vim/curriculum";
import { diffText } from "../../vim/diff";
import { ALL_EDIT_KINDS, EDIT_KIND_LABELS, EDIT_KINDS, type EditKind } from "../../vim/drills/edit";
import { REGISTER_KINDS, type RegisterKind } from "../../vim/drills/register-edit";
import { EDIT_HELP } from "../../vim/edit-help";
import {
  editEfficiency,
  editIdleMs,
  editRemainingMs,
  editRoundStats,
  isEditRoundFinished,
  markEditAssisted,
  pauseEditRound,
  pressEditRoundKey,
  resumeEditRound,
  skipEdit,
  startEditRound,
  tickEditRound,
  type EditResult,
  type EditRound,
} from "../../vim/edit-round";
import { formatKeys, keyFromEvent, parseKeys, type Key } from "../../vim/keys";
import {
  assistedSplit,
  eventsToSamples,
  parseSolutionBlocks,
  PREVIEW_MODE_LABELS,
  PREVIEW_MODES,
  recalculateEditPreview,
  shouldShowPreview,
  type CommandSample,
  type PreviewMode,
} from "../../vim/preview";
import { listRegisters } from "../../vim/registers";
import { ROUND_DURATIONS_S } from "../../vim/round";
import type { VimState } from "../../vim/state";
import { selectionRange } from "../../vim/visual";
import { matchTrainingKey } from "../keys";
import { RoundHistory } from "../shell/History";
import { PanelTitle, Reference, useRunning } from "../shell/panel";
import { Result } from "../shell/Result";
import { RoundBar } from "../shell/RoundBar";
import { LessonModal, OptimalPreview } from "./Preview";

type Props = {
  readonly clock: Clock;
  readonly store: KeyValueStore;
  /** Seed of each new round. */
  readonly newSeed: () => number;
  readonly onBack: () => void;
  readonly settings: VimEditSettings;
  /** Called with the settings the screen saved. */
  readonly onSettings: (settings: VimEditSettings) => void;
  /** Told when a round starts and ends, so the window hides the tree (T18). */
  readonly onRunning?: (running: boolean) => void;
  /** Switches to the Vim Learn screen (T19 AC-7, T20 AC-5). */
  readonly onLearn?: (lessonId?: string) => void;
};

const EDIT_FAMILIES: readonly {
  readonly title: string;
  readonly kinds: readonly EditKind[];
  readonly lockedGroup?: boolean;
}[] = [
  { title: "Edição", kinds: EDIT_KINDS.slice(0, 18) },
  { title: "Visual e blocos", kinds: EDIT_KINDS.slice(18) },
  { title: "Registradores e macros", kinds: REGISTER_KINDS, lockedGroup: true },
];

const TICK_MS = 100;

/** One round being played. `run` changes on every new round, to refocus the box. */
type Run = {
  readonly settings: VimEditSettings;
  readonly round: EditRound;
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

const isRegisterKind = (kind: EditKind): kind is RegisterKind =>
  (REGISTER_KINDS as readonly string[]).includes(kind);

/** The kinds a round can use: the register kinds only after their lesson is done. */
function playable(kinds: readonly EditKind[], unlocked: readonly RegisterKind[]): EditKind[] {
  const usable = kinds.filter((kind) => !isRegisterKind(kind) || unlocked.includes(kind));
  return usable.length > 0 ? usable : [...EDIT_KINDS];
}

function newRun(
  settings: VimEditSettings,
  unlocked: readonly RegisterKind[],
  seed: number,
  run: number,
): Run {
  const round = startEditRound({
    durationMs: settings.durationS * 1000,
    seed,
    kinds: playable(settings.kinds, unlocked),
  });
  return { settings, round, run };
}

/** The mode as the status bar of Vim shows it. */
export function modeLabel(vim: VimState): string {
  if (vim.mode === "insert") return "INSERT";
  if (vim.mode === "visual") {
    const kind = vim.visual?.kind;
    return kind === "line" ? "V-LINE" : kind === "block" ? "V-BLOCK" : "VISUAL";
  }
  return "NORMAL";
}

const percent = (fraction: number): string => `${String(Math.round(fraction * 100))}%`;

/** The Vim edit drill (ADR-T14-1): make the buffer equal to the after. */
export function EditDrill({
  clock,
  store,
  newSeed,
  onBack,
  settings,
  onSettings,
  onRunning,
  onLearn,
}: Props): ReactNode {
  const [unlocked] = useState(() => loadUnlocked(store));
  const [current, setCurrent] = useState<Run>(() => newRun(settings, unlocked, newSeed(), 0));
  const [results, setResults] = useState(() => loadVimEditResults(store));
  const [defaultPreview] = useState<PreviewMode>(() => defaultPreviewMode(store));
  const [now, setNow] = useState(() => clock.now());
  const [plan, setPlan] = useState<PreviewPlan>(() => initialPlan(current.round.target.reference));
  const [openLessonId, setOpenLessonId] = useState<string | null>(null);
  // The latest run and plan, read by the event handlers between renders.
  const latest = useRef(current);
  const planRef = useRef(plan);
  const box = useRef<HTMLTextAreaElement>(null);

  const [storedSamples, setStoredSamples] = useState<readonly CommandSample[]>(() =>
    eventsToSamples(loadEvents(store), "vim.edit"),
  );

  const updatePlan = useCallback((next: PreviewPlan) => {
    planRef.current = next;
    setPlan(next);
  }, []);

  const show = useCallback((next: Run) => {
    latest.current = next;
    setCurrent(next);
  }, []);

  const previewModeOf = useCallback(
    (s: VimEditSettings): PreviewMode => s.preview ?? defaultPreview,
    [defaultPreview],
  );

  const samplesFor = useCallback(
    (round: EditRound): readonly CommandSample[] => [
      ...storedSamples,
      ...round.results.map((r) => ({
        solution: r.reference,
        efficiency: Math.min(1, editEfficiency(r)),
      })),
    ],
    [storedSamples],
  );

  const isPreviewVisible = useCallback(
    (round: EditRound, s: VimEditSettings, p: PreviewPlan, at: number): boolean =>
      shouldShowPreview({
        mode: previewModeOf(s),
        solution: round.target.reference,
        minimum: round.target.referenceKeys,
        keysTyped: round.keys,
        idleMs: editIdleMs(round, at),
        peeked: p.peeked,
        history: samplesFor(round),
      }),
    [previewModeOf, samplesFor],
  );

  const apply = useCallback(
    (round: EditRound) => {
      const run = latest.current;
      if (round === run.round) return;
      if (!isEditRoundFinished(run.round) && isEditRoundFinished(round)) {
        const stats = editRoundStats(round);
        const split = assistedSplit(round.results);
        const at = clock.wallTime();
        appendVimEditResult(store, {
          version: 1,
          kind: "edit",
          durationS: round.config.durationMs / 1000,
          seed: round.config.seed,
          reached: stats.reached,
          skipped: stats.skipped,
          efficiency: stats.efficiency,
          finishedAt: at,
          assisted: split.anyAssisted,
        });
        recordEvents(store, editEvents(round, at), at);
        setResults(loadVimEditResults(store));
        setStoredSamples(eventsToSamples(loadEvents(store), "vim.edit"));
      }
      show({ ...run, round });
    },
    [clock, show, store],
  );

  const { round } = current;
  const previewMode = previewModeOf(current.settings);
  const finished = isEditRoundFinished(round);
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
      let next = tickEditRound(run.round, t);
      if (!next.finished && isPreviewVisible(next, run.settings, planRef.current, t)) {
        if (planRef.current.dirty) {
          const recalc = recalculateEditPreview(next.vim, next.target);
          updatePlan({
            solution: recalc,
            keys: parseKeys(recalc),
            matchedKeys: 0,
            peeked: planRef.current.peeked,
            dirty: false,
          });
        }
        next = markEditAssisted(next);
      }
      apply(next);
    }, TICK_MS);
    return () => {
      clearInterval(id);
    };
  }, [apply, clock, isPreviewVisible, running, updatePlan]);

  const resetRun = (next: Run) => {
    setOpenLessonId(null);
    updatePlan(initialPlan(next.round.target.reference));
    show(next);
  };

  const exit = () => {
    const run = latest.current;
    resetRun(newRun(run.settings, unlocked, run.round.config.seed, run.run));
    box.current?.blur();
  };

  const feed = (key: Key) => {
    const run = latest.current;
    if (run.round.pausedAt !== null || run.round.finished) return;
    const { vim } = run.round;
    if (vim.mode === "cmdline" && key === "<CR>" && vim.cmdline?.trim() === "q") {
      exit();
      return;
    }
    const t = clock.now();
    const curPlan = planRef.current;
    const visibleBefore = isPreviewVisible(run.round, run.settings, curPlan, t);
    const prepared = visibleBefore ? markEditAssisted(run.round) : run.round;
    let nextRound = pressEditRoundKey(prepared, key, t);
    if (nextRound.target.index !== run.round.target.index) {
      updatePlan(initialPlan(nextRound.target.reference));
      apply(nextRound);
      return;
    }
    if (run.round.closingEsc && key === "<Esc>") {
      apply(nextRound);
      return;
    }
    const onPath = !curPlan.dirty && key === curPlan.keys[curPlan.matchedKeys];
    const nextPlanBase: PreviewPlan = onPath
      ? { ...curPlan, matchedKeys: curPlan.matchedKeys + 1 }
      : { ...curPlan, dirty: true };
    const visibleAfter = isPreviewVisible(nextRound, run.settings, nextPlanBase, t);
    if (visibleAfter) {
      nextRound = markEditAssisted(nextRound);
      if (nextPlanBase.dirty) {
        const recalc = recalculateEditPreview(nextRound.vim, nextRound.target);
        updatePlan({
          solution: recalc,
          keys: parseKeys(recalc),
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
    resetRun(newRun(next, unlocked, newSeed(), latest.current.run + 1));
  };

  /** Applies an option from the form, validated like stored settings. */
  const change = (patch: Readonly<Record<string, unknown>>) => {
    const updated = parseVimEditSettings({ ...latest.current.settings, ...patch });
    saveVimEditSettings(store, updated);
    onSettings(updated);
    restart(updated);
  };

  const toggleKind = (kind: EditKind, on: boolean) => {
    // The last kind left on has its checkbox disabled, so the list is never empty.
    change({
      kinds: ALL_EDIT_KINDS.filter((k) =>
        k === kind ? on : latest.current.settings.kinds.includes(k),
      ),
    });
  };

  const peek = () => {
    const run = latest.current;
    if (run.round.finished || run.round.pausedAt !== null) return;
    const cur = planRef.current;
    if (cur.dirty) {
      const recalc = recalculateEditPreview(run.round.vim, run.round.target);
      updatePlan({
        solution: recalc,
        keys: parseKeys(recalc),
        matchedKeys: 0,
        peeked: true,
        dirty: false,
      });
    } else {
      updatePlan({ ...cur, peeked: true });
    }
    apply(markEditAssisted(run.round));
  };

  const openLesson = useCallback(
    (lessonId: string) => {
      setOpenLessonId(lessonId);
      apply(pauseEditRound(latest.current.round, clock.now()));
    },
    [apply, clock],
  );

  const closeLesson = useCallback(() => {
    setOpenLessonId(null);
    const t = clock.now();
    setNow(t);
    apply(resumeEditRound(latest.current.round, t));
    box.current?.focus();
  }, [apply, clock]);

  const { target, vim } = round;
  const masks = useMemo(
    () => diffText(vim.lines.join("\n"), target.after.join("\n")),
    [vim.lines, target.after],
  );
  const historyScores = results
    .filter((r) => r.durationS === current.settings.durationS && !r.assisted)
    .map((r) => r.reached);
  const excludedAssisted = assistedEditRoundCount(results, current.settings.durationS);
  const remainingS = Math.ceil(
    editRemainingMs(round, Math.max(now, round.startedAt ?? now)) / 1000,
  );
  const reached = round.results.filter((r) => !r.skipped).length;
  const insert = vim.mode === "insert";
  const hasLocked = REGISTER_KINDS.some((kind) => !unlocked.includes(kind));

  const previewVisible = !finished && isPreviewVisible(round, current.settings, plan, now);
  const previewBlocks = useMemo(
    () => (previewVisible ? parseSolutionBlocks(plan.solution) : []),
    [previewVisible, plan.solution],
  );

  const helpList = useMemo(
    () => (
      <ul>
        {EDIT_HELP.map((help) => {
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
              {help.example !== undefined && (
                <>
                  <br />
                  <span className="muted">ex.: {help.example}</span>
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
    <div className="screen vim vim-edit">
      <PanelTitle title="Edição">Deixe o texto igual ao depois com o mínimo de teclas.</PanelTitle>

      <div className="vim-options-block" data-panel="options">
        <div className="vim-options" role="group" aria-label="Opções">
          <label htmlFor="vim-duration">Duração</label>
          <select
            id="vim-duration"
            value={current.settings.durationS}
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

        <details className="vim-kinds-details" data-testid="vim-kinds-details">
          <summary>Tipos de edição</summary>
          {EDIT_FAMILIES.map((family) => (
            <div key={family.title} className="vim-kind-family">
              <h3>{family.title}</h3>
              {family.lockedGroup && hasLocked && (
                <p className="muted" data-testid="vim-locked-notice">
                  Alguns tipos são liberados em{" "}
                  <button
                    type="button"
                    className="link"
                    onClick={() => {
                      onLearn?.();
                    }}
                  >
                    Aprender
                  </button>
                  .
                </p>
              )}
              <div className="vim-kinds">
                {family.kinds.map((kind) => {
                  const locked = isRegisterKind(kind) && !unlocked.includes(kind);
                  const on = !locked && current.settings.kinds.includes(kind);
                  const only = on && playable(current.settings.kinds, unlocked).length === 1;
                  return (
                    <span key={kind} className="vim-kind">
                      <label>
                        <input
                          type="checkbox"
                          checked={on}
                          disabled={locked || only}
                          onChange={(e) => {
                            toggleKind(kind, e.target.checked);
                          }}
                        />
                        {EDIT_KIND_LABELS[kind]}
                      </label>
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </details>
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
                ? markEditAssisted(run.round)
                : run.round;
              const next = skipEdit(base, t);
              if (next.target.index !== run.round.target.index) {
                updatePlan(initialPlan(next.target.reference));
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
          <EditResults
            round={round}
            settings={current.settings}
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
                { label: "edições", value: reached },
              ]}
            />
            {previewVisible && (
              <OptimalPreview
                blocks={previewBlocks}
                matchedKeys={plan.matchedKeys}
                onOpenLesson={openLesson}
              />
            )}
            <div className="vim-buffers">
              <pre
                className="vim-code"
                data-testid="vim-code"
                data-edit-index={target.index}
                onClick={() => {
                  box.current?.focus();
                }}
              >
                <Buffer
                  lines={vim.lines}
                  mask={masks.aMask}
                  mark="vim-diff-del"
                  cursor={vim.mode === "cmdline" ? null : vim.cursor}
                  insert={insert}
                  selection={(line) => selectionRange(vim, line)}
                />
              </pre>
              <pre className="vim-after" data-testid="vim-after" data-reference={target.reference}>
                <Buffer lines={target.after} mask={masks.bMask} mark="vim-diff-add" cursor={null} />
              </pre>
            </div>
            <p className="vim-status" data-testid="vim-status">
              {vim.mode === "cmdline" ? (
                <span className="vim-pending">{`:${vim.cmdline ?? ""}`}</span>
              ) : (
                <>
                  <strong>{modeLabel(vim)}</strong>{" "}
                  {vim.recording !== null && (
                    <span className="vim-recording">{`gravando @${vim.recording.name}`}</span>
                  )}{" "}
                  <span className="vim-pending">{formatKeys(vim.pending)}</span>
                </>
              )}
            </p>
            <Registers vim={vim} />
            {round.last !== null && <LastEdit result={round.last} />}
          </>
        )}
      </div>

      <RoundHistory
        scores={historyScores}
        excluded={excludedAssisted}
        unit="edições"
        testId="vim-summary"
      />

      <Reference id="vim-edit-commands" title="Comandos" className="vim-commands">
        {helpList}
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

/** The registers that hold something, as `:reg` lists them. */
function Registers({ vim }: { readonly vim: VimState }): ReactNode {
  const lines = listRegisters(vim);
  return (
    <div
      className="vim-registers"
      data-testid="vim-registers"
      role="region"
      aria-label="Registradores"
    >
      <p className="muted">Registradores</p>
      {lines.length === 0 ? (
        <p className="muted">Nenhum registrador com texto.</p>
      ) : (
        <ul>
          {lines.map((line) => (
            <li key={line.name} data-register={line.name}>
              <code>{`"${line.name}`}</code> <span className="muted">{line.type}</span>{" "}
              <code>{line.text}</code>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** "você: 9 · referência: 4 (ci(x<Esc>)". */
function Comparison({ result }: { readonly result: EditResult }): ReactNode {
  return (
    <>
      {result.skipped ? "pulado" : `você: ${String(result.keys)}`} · referência:{" "}
      {result.referenceKeys} (<code>{result.reference}</code>)
    </>
  );
}

function LastEdit({ result }: { readonly result: EditResult }): ReactNode {
  return (
    <p className="vim-last" data-testid="vim-last">
      <Comparison result={result} />
    </p>
  );
}

function EditResults({
  round,
  settings,
  onNext,
}: {
  readonly round: EditRound;
  readonly settings: VimEditSettings;
  readonly onNext: () => void;
}): ReactNode {
  const stats = editRoundStats(round);
  const split = assistedSplit(round.results);
  return (
    <Result
      headline={
        <>
          <strong data-testid="vim-reached">{stats.reached}</strong> edições
        </>
      }
      pairs={[
        { label: "puladas", value: stats.skipped, testId: "vim-skipped" },
        { label: "eficiência média", value: percent(stats.efficiency), testId: "vim-efficiency" },
        { label: "sem prévia", value: split.withoutPreview, testId: "vim-without-preview" },
        { label: "com prévia", value: split.withPreview, testId: "vim-with-preview" },
      ]}
      extra={
        stats.efficiency > 1 ? (
          <p className="vim-better" data-testid="vim-better">
            melhor que a referência
          </p>
        ) : undefined
      }
      worst={
        <ul className="vim-worst" data-testid="vim-worst">
          {stats.worst.map((result) => (
            <li key={result.index}>
              <Comparison result={result} /> · {percent(editEfficiency(result))}
            </li>
          ))}
        </ul>
      }
      seed={
        <>
          <span data-testid="vim-config">{`${String(settings.durationS)} s`}</span> · seed{" "}
          <span data-testid="vim-seed">{round.config.seed}</span>
        </>
      }
      onPlayAgain={onNext}
    />
  );
}

/**
 * The lines with the characters of `mask` marked, and the block cursor. In
 * insert mode the cursor is a bar and may sit past the last character.
 */
export function Buffer({
  lines,
  mask,
  mark,
  cursor,
  insert = false,
  selection,
}: {
  readonly lines: readonly string[];
  readonly mask: readonly boolean[];
  readonly mark: string;
  readonly cursor: { readonly line: number; readonly col: number } | null;
  readonly insert?: boolean;
  /** The columns `[from, to)` of a line that are selected (visual mode). */
  readonly selection?: (line: number) => { readonly from: number; readonly to: number } | null;
}): ReactNode {
  // Where each line starts in the text the mask was made from.
  const starts = lines.map((_, i) => lines.slice(0, i).reduce((sum, l) => sum + l.length + 1, 0));
  return (
    <>
      {lines.map((text, line) => {
        const base = starts[line] as number;
        const at = cursor !== null && cursor.line === line ? cursor.col : -1;
        const chars = [...text];
        if (at >= chars.length) chars.push(" ");
        const selected = selection?.(line) ?? null;
        return (
          <Fragment key={line}>
            {line > 0 ? "\n" : null}
            {chars.map((ch, col) => {
              const marked = mask[base + col] === true && col < text.length;
              const picked = selected !== null && col >= selected.from && col < selected.to;
              const className = [
                col === at ? `vim-cursor${insert ? " vim-insert" : ""}` : "",
                marked ? mark : "",
                picked && col < text.length ? "vim-selected" : "",
              ]
                .filter(Boolean)
                .join(" ");
              if (className === "") return ch;
              return col === at ? (
                <span
                  key={col}
                  className={className}
                  data-testid="vim-cursor"
                  data-line={line}
                  data-col={col}
                >
                  {ch}
                </span>
              ) : (
                <span key={col} className={className}>
                  {ch}
                </span>
              );
            })}
          </Fragment>
        );
      })}
    </>
  );
}
