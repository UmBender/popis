import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  nextFadingStep,
  nextUncompleted,
  unitStatus,
  type ExerciseStep,
  type UnitStatus,
} from "../../learn/curriculum";
import { SHELL_TRANSCRIPTS, type ShellTranscriptFrame } from "../../shell/cases/transcripts";
import { checkShellCommand } from "../../shell/check";
import {
  SHELL_LESSONS,
  SHELL_UNITS,
  shellCommandDescription,
  shellLessonById,
  type ShellLesson,
} from "../../shell/curriculum";
import type { KeyValueStore } from "../../storage/history";
import { loadShellSettings, parseShellSettings, saveShellSettings } from "../../storage/shell";
import { completeShellLesson, loadShellCompleted } from "../../storage/shell-learn";
import { PanelTitle } from "../shell/panel";
import { isControl, isField } from "../shell/Shell";
import { TerminalView } from "./TerminalView";

/** One bash step every 1200 ms in the animated example terminal. */
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
  readonly initialLesson?: string | null;
};

/** Shell Aprender curriculum screen (T39 AC-6, ADR-T39-1): 9 ordered units with oracle transcripts and adaptive fading. */
export function LearnDrill({ store, onBack, onPractice, initialLesson = null }: Props): ReactNode {
  const [open, setOpen] = useState<string | null>(() =>
    initialLesson !== null && shellLessonById(initialLesson) !== undefined ? initialLesson : null,
  );
  const [completed, setCompleted] = useState(() => loadShellCompleted(store));
  const completedSet = useMemo(() => new Set(completed), [completed]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (open !== null || e.key !== "Enter" || e.ctrlKey || e.metaKey || e.altKey) return;
      if (isField(e.target) || isControl(e.target)) return;
      const next = nextUncompleted(SHELL_LESSONS, completedSet);
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

  const finish = (lesson: ShellLesson) => {
    setCompleted(completeShellLesson(store, lesson.id));
  };

  const practice = (lesson: ShellLesson) => {
    const updated = parseShellSettings({
      ...loadShellSettings(store),
      kinds: lesson.practiceKinds,
    });
    saveShellSettings(store, updated);
    onPractice?.();
  };

  const activeLesson = open !== null ? shellLessonById(open) : undefined;

  return (
    <div className="screen shell-drill">
      <PanelTitle title="Aprender">
        Currículo de bash para a prova em ordem. Cada lição traz explicação, terminal gravado no
        bash real e exercícios com retirada gradual da ajuda.
      </PanelTitle>

      <ol className="vim-units" data-panel="options" aria-label="Unidades">
        {SHELL_UNITS.map((unit) => {
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
  readonly lesson: ShellLesson;
  readonly done: boolean;
  readonly onFinish: () => void;
  readonly onPractice: () => void;
  readonly onList: () => void;
}): ReactNode {
  return (
    <section className="vim-lesson" data-panel="area">
      <h2>{lesson.title}</h2>
      <p data-testid="learn-explanation">{lesson.explanation}</p>
      {lesson.note !== undefined && <p className="muted">{lesson.note}</p>}
      <ul className="vim-lesson-commands" data-testid="learn-commands">
        {lesson.commands.map((command) => {
          const baseKey = command.split(" ")[0] ?? command;
          const desc = shellCommandDescription(baseKey);
          return (
            <li key={command}>
              <code>{command}</code>
              {desc !== undefined && <span className="muted">{` — ${desc}`}</span>}
            </li>
          );
        })}
      </ul>
      <ShellExample lesson={lesson} />
      <ShellExercise lesson={lesson} done={done} onFinish={onFinish} onPractice={onPractice} />
      <div className="actions">
        <button type="button" onClick={onList}>
          Lições
        </button>
      </div>
    </section>
  );
}

/** Animated real-bash session transcript verified by `npm run shell:oracle` (AC-6). */
function ShellExample({ lesson }: { readonly lesson: ShellLesson }): ReactNode {
  const frames: readonly ShellTranscriptFrame[] = (
    SHELL_TRANSCRIPTS[lesson.id] as { readonly frames: readonly ShellTranscriptFrame[] }
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

  const frame = frames[index] as ShellTranscriptFrame;
  const stepNote = index > 0 ? lesson.example.steps[index - 1]?.note : undefined;

  const terminalLines = useMemo(() => {
    const out: string[] = [];
    for (let i = 0; i <= index; i++) {
      const f = frames[i] as ShellTranscriptFrame;
      if (f.cmd !== null) out.push(`$ ${f.cmd}`);
      for (const line of f.output) out.push(line);
    }
    return out.slice(-12);
  }, [frames, index]);

  return (
    <div className="vim-example">
      <h3>Exemplo</h3>
      {lesson.example.scripts?.map((script) => (
        <figure
          key={script.file}
          className="shell-script"
          data-testid="shell-script"
          data-file={script.file}
        >
          <figcaption className="shell-script-file">{script.file}</figcaption>
          <ol className="shell-script-lines">
            {script.lines.map((line, i) => (
              <li key={i} className="shell-script-line">
                <code className="shell-script-code" data-testid="shell-script-code">
                  {line.code}
                </code>
                <span className="shell-script-note" data-testid="shell-script-note">
                  {line.note}
                </span>
              </li>
            ))}
          </ol>
        </figure>
      ))}
      <TerminalView
        cwd={frame.cwd}
        files={frame.files}
        terminalLines={terminalLines}
        terminalTestId="shell-example-terminal"
      />
      {stepNote !== undefined && (
        <p className="muted gdb-example-note" data-testid="shell-example-note">
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

/** Three exercises with adaptive fading (ADR-T20-1, ADR-T39-1): full command -> lesson commands -> no help. */
function ShellExercise({
  lesson,
  done,
  onFinish,
  onPractice,
}: {
  readonly lesson: ShellLesson;
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

  const submit = () => {
    const trimmed = text.trim();
    if (trimmed.length === 0) return;
    const res = checkShellCommand(trimmed, exercise.expected);
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
      <TerminalView
        cwd={exercise.cwd}
        files={exercise.files}
        terminalLines={exercise.terminalLines}
      />

      {step === 0 && (
        <p className="vim-reference" data-testid="learn-reference">
          Comando: <code>{exercise.canonical}</code>
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
            $
          </span>
          <input
            ref={inputRef}
            type="text"
            className="gdb-input"
            aria-label="Comando bash"
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
        {(finished || done) && lesson.practiceKinds.length > 0 && (
          <button type="button" onClick={onPractice}>
            Treinar
          </button>
        )}
      </div>
    </div>
  );
}
