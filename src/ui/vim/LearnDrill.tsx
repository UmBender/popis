import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Clock } from "../../core/clock";
import type { KeyValueStore } from "../../storage/history";
import {
  loadVimSettings,
  parseVimEditSettings,
  parseVimSettings,
  saveVimEditSettings,
  saveVimSettings,
  type VimEditSettings,
} from "../../storage/vim";
import { completeLesson, loadCompleted } from "../../storage/vim-learn";
import {
  UNITS,
  commandDescription,
  curriculumExampleFrames,
  curriculumLessonById,
  nextExerciseStep,
  nextUncompletedLesson,
  unitStatus,
  type CurriculumLesson,
  type ExerciseStep,
  type LessonExercise,
  type UnitStatus,
} from "../../vim/curriculum";
import { diffText } from "../../vim/diff";
import { pressEditKey } from "../../vim/edit";
import { pressKey } from "../../vim/engine";
import { formatKeys, keyFromEvent, parseKeys, type Key } from "../../vim/keys";
import type { Frame } from "../../vim/lessons";
import { createState, type Pos, type VimState } from "../../vim/state";
import { selectionRange } from "../../vim/visual";
import { PanelTitle } from "../shell/panel";
import { isControl, isField } from "../shell/Shell";
import { Buffer, modeLabel } from "./EditDrill";

/** One key of the animated example every 600 ms (ADR-T16-1). */
const STEP_MS = 600;

const STATUS_LABELS: Readonly<Record<UnitStatus, string>> = {
  new: "nova",
  "in-progress": "em andamento",
  done: "concluída",
};

type Props = {
  readonly clock: Clock;
  readonly store: KeyValueStore;
  readonly newSeed: () => number;
  readonly onBack: () => void;
  readonly settings: VimEditSettings;
  readonly onSettings: (settings: VimEditSettings) => void;
  readonly onPractice?: (drill: "motion" | "edit") => void;
  readonly initialLesson?: string | null;
  readonly readOnly?: boolean;
};

/** Mask highlighting a single target cell inside `lines` for `Buffer`. */
function targetMask(lines: readonly string[], target: Pos): boolean[] {
  const total = lines.reduce((sum, l) => sum + l.length + 1, 0);
  const mask = new Array<boolean>(total).fill(false);
  const offset =
    lines.slice(0, target.line).reduce((sum, l) => sum + l.length + 1, 0) + target.col;
  mask[offset] = true;
  return mask;
}

/** The Learn mode (ADR-T16-1, ADR-T20-1): an ordered 15-unit curriculum with fading help. */
export function LearnDrill({
  store,
  onBack,
  settings,
  onSettings,
  onPractice,
  initialLesson = null,
  readOnly = false,
}: Props): ReactNode {
  const [open, setOpen] = useState<string | null>(() =>
    initialLesson !== null && curriculumLessonById(initialLesson) !== undefined
      ? initialLesson
      : null,
  );
  const [completed, setCompleted] = useState(() => loadCompleted(store));
  const completedSet = useMemo(() => new Set(completed), [completed]);

  useEffect(() => {
    if (initialLesson !== null && curriculumLessonById(initialLesson) !== undefined) {
      setOpen(initialLesson);
    }
  }, [initialLesson]);

  // AC-4: Enter opens the next uncompleted lesson when on the list.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (open !== null || e.key !== "Enter" || e.ctrlKey || e.metaKey || e.altKey) return;
      if (isField(e.target) || isControl(e.target)) return;
      const next = nextUncompletedLesson(completedSet);
      if (next !== null) {
        e.preventDefault();
        setOpen(next.id);
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open, completedSet]);

  const finish = (lesson: CurriculumLesson) => {
    setCompleted(completeLesson(store, lesson.id));
    if (lesson.registerKind !== undefined && !settings.kinds.includes(lesson.registerKind)) {
      const updated = parseVimEditSettings({
        ...settings,
        kinds: [...settings.kinds, lesson.registerKind],
      });
      saveVimEditSettings(store, updated);
      onSettings(updated);
    }
  };

  const practice = (lesson: CurriculumLesson) => {
    if (lesson.practice.drill === "motion") {
      const updated = parseVimSettings({
        ...loadVimSettings(store),
        level: lesson.practice.level,
      });
      saveVimSettings(store, updated);
      onPractice?.("motion");
    } else {
      const updated = parseVimEditSettings({
        ...settings,
        drill: "edit",
        kinds: lesson.practice.kinds,
      });
      saveVimEditSettings(store, updated);
      onSettings(updated);
      onPractice?.("edit");
    }
  };

  const activeLesson = open !== null ? curriculumLessonById(open) : undefined;

  return (
    <div className="screen vim">
      <PanelTitle title="Aprender">
        Currículo em ordem, do básico ao avançado. Cada lição tem explicação, exemplo animado e
        exercícios com retirada gradual da ajuda.
      </PanelTitle>

      <ol className="vim-units" data-panel="options" aria-label="Unidades">
        {UNITS.map((unit) => {
          const status = unitStatus(unit, completedSet);
          return (
            <li key={unit.id} className="vim-unit">
              <div className="vim-unit-header">
                <span className="vim-unit-title">{`${String(unit.number)}. ${unit.title}`}</span>
                <span
                  className="vim-unit-status"
                  data-status={status}
                  data-testid={`unit-status-${unit.id}`}
                >
                  {STATUS_LABELS[status]}
                </span>
              </div>
              <ul className="vim-lessons" aria-label={`Lições de ${unit.title}`}>
                {unit.lessons.map((lesson) => (
                  <li key={lesson.id}>
                    <button
                      type="button"
                      aria-current={open === lesson.id}
                      onClick={() => {
                        setOpen(lesson.id);
                      }}
                    >
                      {completedSet.has(lesson.id) ? `${lesson.title} — feito` : lesson.title}
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ol>

      {activeLesson !== undefined && (
        <LessonView
          key={activeLesson.id}
          lesson={activeLesson}
          done={completedSet.has(activeLesson.id)}
          readOnly={readOnly}
          onFinish={() => {
            finish(activeLesson);
          }}
          onPractice={() => {
            practice(activeLesson);
          }}
          onList={() => {
            setOpen(null);
          }}
        />
      )}

      <div className="actions">
        <button type="button" onClick={onBack}>
          Voltar
        </button>
      </div>
    </div>
  );
}

function LessonView({
  lesson,
  done,
  readOnly,
  onFinish,
  onPractice,
  onList,
}: {
  readonly lesson: CurriculumLesson;
  readonly done: boolean;
  readonly readOnly: boolean;
  readonly onFinish: () => void;
  readonly onPractice: () => void;
  readonly onList: () => void;
}): ReactNode {
  return (
    <section className="vim-lesson" data-panel="area">
      <h2>{lesson.title}</h2>
      <p data-testid="learn-explanation">{lesson.explanation}</p>
      <ul className="vim-lesson-commands" data-testid="learn-commands">
        {lesson.commands.map((command) => {
          const desc = commandDescription(command);
          return (
            <li key={command}>
              <code>{command}</code>
              {desc !== undefined && <span className="muted">{` — ${desc}`}</span>}
            </li>
          );
        })}
      </ul>
      <Example lesson={lesson} />
      {readOnly ? (
        <p className="muted" data-testid="learn-readonly-notice">
          No celular o Aprender fica só para leitura: os exercícios precisam de teclado físico.
        </p>
      ) : (
        <Exercise
          lesson={lesson}
          done={done}
          onFinish={onFinish}
          onPractice={onPractice}
          onExit={onList}
        />
      )}
      <div className="actions">
        <button type="button" onClick={onList}>
          Lições
        </button>
      </div>
    </section>
  );
}

/** The animated example: the keys appear one by one and the buffer changes. */
function Example({ lesson }: { readonly lesson: CurriculumLesson }): ReactNode {
  const frames = useMemo(() => curriculumExampleFrames(lesson), [lesson]);
  const keys = useMemo(() => parseKeys(lesson.example.keys), [lesson]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const last = frames.length - 1;
  const running = playing && index < last;

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setIndex((i) => Math.min(i + 1, last));
    }, STEP_MS);
    return () => {
      clearInterval(id);
    };
  }, [running, last]);

  const frame = frames[index] as Frame;
  const motionMask = useMemo(
    () =>
      lesson.example.kind === "motion"
        ? targetMask(lesson.example.lines, lesson.example.target)
        : [],
    [lesson.example],
  );

  return (
    <div className="vim-example">
      <h3>Exemplo</h3>
      <pre className="vim-code" data-testid="learn-buffer">
        <Buffer
          lines={frame.lines}
          mask={motionMask}
          mark={lesson.example.kind === "motion" ? "vim-target" : ""}
          cursor={frame.cursor}
          insert={frame.mode === "insert"}
        />
      </pre>
      <p className="vim-status" data-testid="learn-keys">
        {formatKeys(keys.slice(0, index))}
      </p>
      <div className="actions">
        <button
          type="button"
          onClick={() => {
            if (index >= last) setIndex(0);
            setPlaying(index >= last || !playing);
          }}
        >
          {running ? "Pausar" : "Tocar"}
        </button>
        <button
          type="button"
          onClick={() => {
            setIndex(0);
            setPlaying(true);
          }}
        >
          Recomeçar
        </button>
      </div>
    </div>
  );
}

function initialVimState(exercise: LessonExercise): VimState {
  return createState(exercise.lines, exercise.start);
}

/** Three exercises with adaptive fading (AC-3): full reference → commands → no help. */
function Exercise({
  lesson,
  done,
  onFinish,
  onPractice,
  onExit,
}: {
  readonly lesson: CurriculumLesson;
  readonly done: boolean;
  readonly onFinish: () => void;
  readonly onPractice: () => void;
  readonly onExit: () => void;
}): ReactNode {
  const [step, setStep] = useState<ExerciseStep>(0);
  const exercise = lesson.exercises[step];
  const reference = useMemo(() => parseKeys(exercise.reference), [exercise]);
  const [vim, setVim] = useState<VimState>(() => initialVimState(lesson.exercises[0]));
  const [cmdline, setCmdline] = useState<string | null>(null);
  const [typed, setTyped] = useState<readonly Key[]>([]);
  const [finished, setFinished] = useState(false);
  const latest = useRef({ step, vim, cmdline, typed, finished });
  const box = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    box.current?.focus();
  }, [step]);

  const loadStep = (nextStep: ExerciseStep) => {
    const state = initialVimState(lesson.exercises[nextStep]);
    latest.current = { step: nextStep, vim: state, cmdline: null, typed: [], finished: false };
    setStep(nextStep);
    setVim(state);
    setCmdline(null);
    setTyped([]);
    setFinished(false);
  };

  const feed = (key: Key) => {
    const cur = latest.current;
    const ex = lesson.exercises[cur.step];
    if (ex.kind === "motion") {
      if (cur.cmdline !== null) {
        if (key === "<Esc>") {
          latest.current = { ...cur, cmdline: null };
          setCmdline(null);
        } else if (key === "<CR>") {
          if (cur.cmdline.trim() === "q") onExit();
          else {
            latest.current = { ...cur, cmdline: null };
            setCmdline(null);
          }
        } else if (key === "<BS>") {
          const nextCmd = cur.cmdline.length === 0 ? null : cur.cmdline.slice(0, -1);
          latest.current = { ...cur, cmdline: nextCmd };
          setCmdline(nextCmd);
        } else if (key.length === 1) {
          const nextCmd = cur.cmdline + key;
          latest.current = { ...cur, cmdline: nextCmd };
          setCmdline(nextCmd);
        }
        return;
      }
      if (key === ":" && cur.vim.pending.length === 0) {
        latest.current = { ...cur, cmdline: "" };
        setCmdline("");
        return;
      }
    }
    if (cur.vim.mode === "cmdline" && key === "<CR>" && cur.vim.cmdline?.trim() === "q") {
      onExit();
      return;
    }
    if (cur.finished) return;
    const refKeys = parseKeys(ex.reference);
    const next =
      ex.kind === "motion" ? pressKey(cur.vim, key, ex.level).state : pressEditKey(cur.vim, key);
    const keys = [...cur.typed, key];
    const reached =
      ex.kind === "motion"
        ? next.cursor.line === ex.target.line &&
          next.cursor.col === ex.target.col &&
          next.pending.length === 0
        : next.mode === "normal" &&
          next.lines.length === ex.after.length &&
          next.lines.every((line, i) => line === ex.after[i]);

    if (reached) {
      const outcome = nextExerciseStep(cur.step, keys.length, refKeys.length);
      if (outcome === "done") {
        latest.current = { step: cur.step, vim: next, cmdline: null, typed: keys, finished: true };
        setVim(next);
        setTyped(keys);
        setFinished(true);
        onFinish();
      } else {
        loadStep(outcome);
      }
      return;
    }

    latest.current = { step: cur.step, vim: next, cmdline: null, typed: keys, finished: false };
    setVim(next);
    setTyped(keys);
  };

  const restart = () => {
    loadStep(latest.current.step);
    box.current?.focus();
  };

  const matched = typed.every((key, i) => key === reference[i]) ? typed.length : 0;
  const masks = useMemo(
    () =>
      exercise.kind === "edit"
        ? diffText(vim.lines.join("\n"), exercise.after.join("\n"))
        : { aMask: targetMask(exercise.lines, exercise.target), bMask: [] },
    [vim.lines, exercise],
  );

  return (
    <div className="vim-exercise typing-area">
      <h3 data-testid="learn-step">{`Exercício ${String(step + 1)} de 3`}</h3>
      <textarea
        ref={box}
        className="typing-input"
        aria-label="Teclas do Vim"
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        onChange={(e) => {
          if ((e.nativeEvent as InputEvent).isComposing) return;
          const text = e.target.value;
          e.target.value = "";
          for (const ch of text.replace(/[\r\n]/g, "")) feed(ch);
        }}
        onCompositionEnd={(e) => {
          const text = e.currentTarget.value;
          e.currentTarget.value = "";
          for (const ch of text.replace(/[\r\n]/g, "")) feed(ch);
        }}
        onKeyDown={(e) => {
          if (e.nativeEvent.isComposing) return;
          const key = keyFromEvent(e);
          if (key === null) return;
          e.preventDefault();
          feed(key);
        }}
      />
      <pre
        className="vim-code"
        data-testid="vim-code"
        onClick={() => {
          box.current?.focus();
        }}
      >
        <Buffer
          lines={vim.lines}
          mask={masks.aMask}
          mark={exercise.kind === "motion" ? "vim-target" : "vim-diff-del"}
          cursor={vim.mode === "cmdline" ? null : vim.cursor}
          insert={vim.mode === "insert"}
          selection={(line) => selectionRange(vim, line)}
        />
      </pre>
      {exercise.kind === "edit" && (
        <pre className="vim-after" data-testid="vim-after">
          <Buffer lines={exercise.after} mask={masks.bMask} mark="vim-diff-add" cursor={null} />
        </pre>
      )}
      <p className="vim-status" data-testid="vim-status">
        {cmdline !== null ? (
          <span className="vim-pending">{`:${cmdline}`}</span>
        ) : vim.mode === "cmdline" ? (
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
      {step === 0 && (
        <p className="vim-reference" data-testid="learn-reference">
          {reference.map((key, i) => (
            <Fragment key={i}>
              {i > 0 ? " " : null}
              <span
                className={i === matched ? "vim-next-key" : i < matched ? "muted" : undefined}
                data-testid={i === matched && !finished ? "learn-next-key" : undefined}
              >
                {key}
              </span>
            </Fragment>
          ))}
        </p>
      )}
      {step === 1 && (
        <p className="vim-reference" data-testid="learn-exercise-commands">
          Comandos:{" "}
          {lesson.commands.map((cmd, i) => (
            <Fragment key={cmd}>
              {i > 0 ? " · " : null}
              <code>{cmd}</code>
            </Fragment>
          ))}
        </p>
      )}
      {(finished || done) && (
        <p className="vim-better" data-testid={finished ? "learn-done" : "learn-was-done"}>
          {finished ? "Lição concluída! Pronto para o treino livre." : "Esta lição já foi concluída."}
        </p>
      )}
      <div className="actions">
        <button type="button" onClick={restart}>
          Recomeçar exercício
        </button>
        {(finished || done) && (
          <button type="button" onClick={onPractice}>
            Treinar
          </button>
        )}
      </div>
    </div>
  );
}
