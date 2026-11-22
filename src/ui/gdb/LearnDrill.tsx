import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { LESSON_TRANSCRIPTS, type TranscriptFrame } from "../../gdb/cases/transcripts";
import { checkCommand } from "../../gdb/check";
import { checkOutput } from "../../gdb/check-output";
import {
  GDB_LESSONS,
  GDB_UNITS,
  gdbCommandDescription,
  gdbLessonById,
  isOutputLesson,
  type GdbLesson,
} from "../../gdb/curriculum";
import { programById } from "../../gdb/programs";
import {
  nextFadingStep,
  nextUncompleted,
  unitStatus,
  type ExerciseStep,
  type UnitStatus,
} from "../../learn/curriculum";
import {
  loadGdbOutSettings,
  loadGdbSettings,
  parseGdbOutSettings,
  parseGdbSettings,
  saveGdbOutSettings,
  saveGdbSettings,
} from "../../storage/gdb";
import { completeGdbLesson, loadGdbCompleted } from "../../storage/gdb-learn";
import type { KeyValueStore } from "../../storage/history";
import { PanelTitle } from "../shell/panel";
import { isControl, isField } from "../shell/Shell";
import { CodeView } from "./CodeView";

/** One gdb command step every 1200 ms in the animated session. */
const STEP_MS = 1200;

const STATUS_LABELS: Readonly<Record<UnitStatus, string>> = {
  new: "nova",
  "in-progress": "em andamento",
  done: "concluída",
};

type Props = {
  readonly store: KeyValueStore;
  readonly onBack: () => void;
  readonly onPractice?: () => void;
  readonly onPracticeOutput?: () => void;
  readonly initialLesson?: string | null;
};

/** GDB Aprender curriculum screen (T25 AC-6, AC-7; T26 AC-8): ordered units with oracle transcripts and adaptive fading. */
export function LearnDrill({
  store,
  onBack,
  onPractice,
  onPracticeOutput,
  initialLesson = null,
}: Props): ReactNode {
  const [open, setOpen] = useState<string | null>(() =>
    initialLesson !== null && gdbLessonById(initialLesson) !== undefined ? initialLesson : null,
  );
  const [completed, setCompleted] = useState(() => loadGdbCompleted(store));
  const completedSet = useMemo(() => new Set(completed), [completed]);

  // AC-7: Enter on the list opens the next uncompleted lesson (reusing Vim's convention).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (open !== null || e.key !== "Enter" || e.ctrlKey || e.metaKey || e.altKey) return;
      if (isField(e.target) || isControl(e.target)) return;
      const next = nextUncompleted(GDB_LESSONS, completedSet);
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

  const finish = (lesson: GdbLesson) => {
    setCompleted(completeGdbLesson(store, lesson.id));
  };

  const practice = (lesson: GdbLesson) => {
    if (isOutputLesson(lesson)) {
      const updated = parseGdbOutSettings({
        ...loadGdbOutSettings(store),
        kinds: lesson.practiceOutputKinds,
      });
      saveGdbOutSettings(store, updated);
      onPracticeOutput?.();
      return;
    }
    const updated = parseGdbSettings({
      ...loadGdbSettings(store),
      kinds: lesson.practiceKinds,
    });
    saveGdbSettings(store, updated);
    onPractice?.();
  };

  const activeLesson = open !== null ? gdbLessonById(open) : undefined;

  return (
    <div className="screen gdb">
      <PanelTitle title="Aprender">
        Currículo de GDB em ordem. Cada lição traz explicação, sessão gravada do gdb real e
        exercícios com retirada gradual da ajuda.
      </PanelTitle>

      <ol className="vim-units" data-panel="options" aria-label="Unidades">
        {GDB_UNITS.map((unit) => {
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
  onFinish,
  onPractice,
  onList,
}: {
  readonly lesson: GdbLesson;
  readonly done: boolean;
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
          const desc = gdbCommandDescription(command);
          return (
            <li key={command}>
              <code>{command}</code>
              {desc !== undefined && <span className="muted">{` — ${desc}`}</span>}
            </li>
          );
        })}
      </ul>
      <GdbExample lesson={lesson} />
      <GdbExercise lesson={lesson} done={done} onFinish={onFinish} onPractice={onPractice} />
      <div className="actions">
        <button type="button" onClick={onList}>
          Lições
        </button>
      </div>
    </section>
  );
}

/** Animated real-gdb session transcript: steps command by command with arrow moving on the code. */
function GdbExample({ lesson }: { readonly lesson: GdbLesson }): ReactNode {
  const prog = useMemo(() => programById(lesson.example.programId), [lesson.example.programId]);
  const frames: readonly TranscriptFrame[] = (
    LESSON_TRANSCRIPTS[lesson.id] as { readonly frames: readonly TranscriptFrame[] }
  ).frames;

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

  const frame = frames[index] as TranscriptFrame;
  const stepNote = index > 0 ? lesson.example.steps[index - 1]?.note : undefined;

  const sessionLines = useMemo(() => {
    const out: string[] = [];
    for (let i = 0; i <= index; i++) {
      const f = frames[i] as TranscriptFrame;
      if (f.cmd !== null) out.push(`(gdb) ${f.cmd}`);
      for (const line of f.output) out.push(line);
    }
    return out.slice(-10);
  }, [frames, index]);

  const bpMarks = useMemo(
    () => frame.breakpoints.map((line, i) => ({ id: i + 1, line, enabled: true })),
    [frame.breakpoints],
  );

  return (
    <div className="vim-example">
      <h3>Exemplo</h3>
      <CodeView
        file={prog.file}
        lines={prog.lines}
        currentLine={frame.line}
        breakpoints={bpMarks}
        sessionLines={sessionLines}
        codeTestId="gdb-example-code"
        sessionTestId="gdb-example-session"
      />
      {stepNote !== undefined && (
        <p className="muted gdb-example-note" data-testid="gdb-example-note">
          {stepNote}
        </p>
      )}
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

/** Three exercises with adaptive fading (ADR-T20-1, ADR-T25-1): full command -> lesson commands -> no help. */
function GdbExercise({
  lesson,
  done,
  onFinish,
  onPractice,
}: {
  readonly lesson: GdbLesson;
  readonly done: boolean;
  readonly onFinish: () => void;
  readonly onPractice: () => void;
}): ReactNode {
  const [step, setStep] = useState<ExerciseStep>(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [text, setText] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const exercise = lesson.exercises[step];
  const prog = useMemo(() => programById(exercise.programId), [exercise.programId]);

  useEffect(() => {
    if (!finished) inputRef.current?.focus();
  }, [step, finished]);

  const resetStep = (nextStep: ExerciseStep) => {
    setStep(nextStep);
    setWrongCount(0);
    setText("");
    setFeedback(null);
    setFinished(false);
  };

  const isOut = exercise.mode === "output";

  const submit = () => {
    const trimmed = text.trim();
    if (trimmed.length === 0) return;
    const res =
      exercise.mode === "output"
        ? checkOutput(trimmed, exercise.canonical, {
            command: exercise.command,
            kind: exercise.commandKind,
            fallbackReason: exercise.reason,
          })
        : checkCommand(trimmed, exercise.expected, exercise.context);
    if (!res.ok) {
      setWrongCount((c) => c + 1);
      setFeedback(res.reason);
      return;
    }
    const next = nextFadingStep(step, wrongCount === 0);
    if (next === "done") {
      setText("");
      setFeedback(null);
      setFinished(true);
      onFinish();
    } else {
      resetStep(next);
    }
  };

  return (
    <div className="vim-exercise">
      <h3 data-testid="learn-step">{`Exercício ${String(step + 1)} de 3`}</h3>
      <p className="gdb-prompt" data-testid="learn-exercise-prompt">
        {exercise.prompt}
      </p>
      <CodeView
        file={prog.file}
        lines={prog.lines}
        currentLine={exercise.stop.line}
        breakpoints={exercise.stop.breakpoints}
        sessionLines={exercise.stop.sessionLines}
      />

      {step === 0 && (
        <p className="vim-reference" data-testid="learn-reference">
          {isOut ? "Saída: " : "Comando: "}
          <code>{exercise.canonical}</code>
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

      {!finished && (
        <form
          className="gdb-input-row"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <span className="gdb-prompt-prefix" aria-hidden="true">
            {isOut ? "$1 =" : "(gdb)"}
          </span>
          <input
            ref={inputRef}
            type="text"
            className="gdb-input"
            aria-label={isOut ? "Saída do gdb" : "Comando gdb"}
            value={text}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="send"
            onChange={(e) => {
              setText(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.ctrlKey && !e.metaKey && !e.altKey) {
                e.preventDefault();
                submit();
              }
            }}
          />
          <button type="submit" className="primary gdb-send">
            Enviar
          </button>
        </form>
      )}

      {feedback !== null && (
        <p className="gdb-feedback gdb-feedback-wrong" data-testid="learn-feedback">
          {feedback}
        </p>
      )}

      {(finished || done) && (
        <p className="vim-better" data-testid={finished ? "learn-done" : "learn-was-done"}>
          {finished
            ? "Lição concluída! Pronto para o treino livre."
            : "Esta lição já foi concluída."}
        </p>
      )}

      <div className="actions">
        <button
          type="button"
          onClick={() => {
            resetStep(step);
            inputRef.current?.focus();
          }}
        >
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
