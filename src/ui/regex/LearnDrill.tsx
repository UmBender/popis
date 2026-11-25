import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  nextFadingStep,
  nextUncompleted,
  unitStatus,
  type ExerciseStep,
  type UnitStatus,
} from "../../learn/curriculum";
import {
  evaluateRegexItem,
  judgeRegexSubmission,
  type CasarEval,
  type ExtrairEval,
  type LerEval,
  type TrocarEval,
} from "../../regex/check";
import { applyReplace, compile, REGEX_DIALECT_LABELS } from "../../regex/compile";
import {
  REGEX_LESSONS,
  REGEX_UNITS,
  regexLessonById,
  type RegexLesson,
} from "../../regex/curriculum";
import type { KeyValueStore } from "../../storage/history";
import { loadRegexSettings, parseRegexSettings, saveRegexSettings } from "../../storage/regex";
import { completeRegexLesson, loadRegexCompleted } from "../../storage/regex-learn";
import { PanelTitle } from "../shell/panel";
import { isControl, isField } from "../shell/Shell";
import { CasarLines, ExtrairLines, HighlightedText, LerLines, TrocarLines } from "./MatchLines";
import { canonicalDisplay } from "./PracticeDrill";
import { useFrameValue } from "./useFrameValue";

/** One regex example step every 1400 ms in the animated example. */
const STEP_MS = 1400;

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

/** Regex Aprender curriculum screen (T45 AC-6): 9 ordered units with animated highlight and adaptive fading. */
export function LearnDrill({ store, onBack, onPractice, initialLesson = null }: Props): ReactNode {
  const [open, setOpen] = useState<string | null>(() =>
    initialLesson !== null && regexLessonById(initialLesson) !== undefined ? initialLesson : null,
  );
  const [completed, setCompleted] = useState(() => loadRegexCompleted(store));
  const completedSet = useMemo(() => new Set(completed), [completed]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (open !== null || e.key !== "Enter" || e.ctrlKey || e.metaKey || e.altKey) return;
      if (isField(e.target) || isControl(e.target)) return;
      const next = nextUncompleted(REGEX_LESSONS, completedSet);
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

  const finish = (lesson: RegexLesson) => {
    setCompleted(completeRegexLesson(store, lesson.id));
  };

  const practice = (lesson: RegexLesson) => {
    const updated = parseRegexSettings({
      ...loadRegexSettings(store),
      dialect: lesson.practiceDialect,
      kinds: lesson.practiceKinds,
    });
    saveRegexSettings(store, updated);
    onPractice?.();
  };

  const activeLesson = open !== null ? regexLessonById(open) : undefined;

  return (
    <div className="screen regex">
      <PanelTitle title="Aprender">
        Currículo de expressões regulares em ordem. Cada lição traz explicação, destaque animado e
        exercícios com retirada gradual da ajuda.
      </PanelTitle>

      <ol className="vim-units" data-panel="options" aria-label="Unidades">
        {REGEX_UNITS.map((unit) => {
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
  readonly lesson: RegexLesson;
  readonly done: boolean;
  readonly onFinish: () => void;
  readonly onPractice: () => void;
  readonly onList: () => void;
}): ReactNode {
  return (
    <section className="vim-lesson" data-panel="area">
      <div className="regex-item-head">
        <h2>{lesson.title}</h2>
        <span className="regex-mode-badge muted">{REGEX_DIALECT_LABELS[lesson.dialect]}</span>
      </div>
      <p data-testid="learn-explanation">{lesson.explanation}</p>
      <ul className="vim-lesson-commands" data-testid="learn-tokens">
        {lesson.tokens.map((t) => (
          <li key={t.syntax}>
            <code>{t.syntax}</code>
            <span className="muted">{` — ${t.desc}`}</span>
          </li>
        ))}
      </ul>
      <RegexExampleView lesson={lesson} />
      <RegexExerciseView lesson={lesson} done={done} onFinish={onFinish} onPractice={onPractice} />
      <div className="actions">
        <button type="button" onClick={onList}>
          Lições
        </button>
      </div>
    </section>
  );
}

/** Animated highlight example stepping through progressive regexes. */
function RegexExampleView({ lesson }: { readonly lesson: RegexLesson }): ReactNode {
  const { example } = lesson;
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const last = example.steps.length - 1;
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

  const step = example.steps[index]!;
  const compiled = useMemo(
    () => compile(step.pattern, example.dialect, example.mode),
    [example.dialect, example.mode, step.pattern],
  );
  const matcher = compiled.ok ? compiled.matcher : /* v8 ignore next */ null;

  return (
    <div className="vim-example">
      <h3>Exemplo</h3>
      <div className="regex-example-box">
        <div className="regex-example-head">
          <code data-testid="regex-example-pattern">
            {step.replacement !== undefined
              ? `${step.pattern}  →  ${step.replacement}`
              : step.pattern}
          </code>
          <span className="muted">
            {`passo ${String(index + 1)}/${String(example.steps.length)}`}
          </span>
        </div>
        <ul className="regex-list" data-testid="regex-example-lines">
          {example.lines.map((line, i) => {
            const spans = matcher !== null ? matcher.findAll(line) : /* v8 ignore next */ [];
            const replaced =
              matcher !== null && step.replacement !== undefined
                ? applyReplace(matcher, line, step.replacement)
                : null;
            return (
              <li key={i} className="regex-row regex-row-wrap">
                <span
                  className={spans.length > 0 ? "regex-mark regex-mark-ok" : "regex-mark muted"}
                >
                  {spans.length > 0 ? "✓" : "·"}
                </span>
                <code className="regex-line-code">
                  <HighlightedText text={line} spans={spans} />
                </code>
                {replaced !== null && replaced.ok && (
                  <span className="muted">
                    → <code>{replaced.output}</code>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
      <p className="muted gdb-example-note" data-testid="regex-example-note">
        {step.note}
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

/** Three exercises with adaptive fading (ADR-T20-1, ADR-T25-1, ADR-T45-1). */
function RegexExerciseView({
  lesson,
  done,
  onFinish,
  onPractice,
}: {
  readonly lesson: RegexLesson;
  readonly done: boolean;
  readonly onFinish: () => void;
  readonly onPractice: () => void;
}): ReactNode {
  const [step, setStep] = useState<ExerciseStep>(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [pattern, setPattern] = useState("");
  const [replacement, setReplacement] = useState("");
  const [selected, setSelected] = useState<boolean[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const exercise = lesson.exercises[step];

  useEffect(() => {
    if (!finished && exercise.kind !== "ler") inputRef.current?.focus();
  }, [step, finished, exercise.kind]);

  const resetStep = (nextStep: ExerciseStep) => {
    setStep(nextStep);
    setWrongCount(0);
    setPattern("");
    setReplacement("");
    setSelected([]);
    setFeedback(null);
    setFinished(false);
  };

  const liveInput = useFrameValue({ pattern, replacement });
  const idle = liveInput.pattern.length === 0;

  const liveEval = useMemo(() => {
    if (exercise.kind !== "ler" && idle) return null;
    return evaluateRegexItem(exercise, {
      pattern: liveInput.pattern,
      replacement: liveInput.replacement,
      selected,
    });
  }, [exercise, idle, liveInput.pattern, liveInput.replacement, selected]);

  const liveError = liveEval !== null && !liveEval.ok ? liveEval.error : null;

  const submit = () => {
    if (exercise.kind !== "ler" && pattern.length === 0) return;
    const verdict = judgeRegexSubmission(exercise, { pattern, replacement, selected });
    if (!verdict.passed) {
      setWrongCount((c) => c + 1);
      setFeedback(verdict.feedback);
      return;
    }
    const next = nextFadingStep(step, wrongCount === 0);
    if (next === "done") {
      setPattern("");
      setReplacement("");
      setFeedback(null);
      setFinished(true);
      onFinish();
    } else {
      resetStep(next);
    }
  };

  const onEnter = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="vim-exercise">
      <h3 data-testid="learn-step">{`Exercício ${String(step + 1)} de 3`}</h3>
      <p className="gdb-prompt" data-testid="learn-exercise-prompt">
        {exercise.prompt}
      </p>

      {step === 0 && (
        <p className="vim-reference" data-testid="learn-reference">
          Padrão: <code>{canonicalDisplay(exercise)}</code>
        </p>
      )}
      {step === 1 && (
        <p className="vim-reference" data-testid="learn-exercise-tokens">
          Recursos:{" "}
          {lesson.tokens.map((t, i) => (
            <Fragment key={t.syntax}>
              {i > 0 ? " · " : null}
              <code>{t.syntax}</code>
            </Fragment>
          ))}
        </p>
      )}

      {!finished && (
        <form
          className="regex-form"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          {exercise.kind !== "ler" && (
            <div className="regex-input-stack">
              <div className="gdb-input-row">
                <span className="gdb-prompt-prefix" aria-hidden="true">
                  /
                </span>
                <input
                  ref={inputRef}
                  type="text"
                  className="gdb-input"
                  aria-label="Expressão regular"
                  value={pattern}
                  autoComplete="off"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="send"
                  onChange={(e) => {
                    setPattern(e.target.value);
                    setFeedback(null);
                  }}
                  onKeyDown={onEnter}
                />
              </div>

              {exercise.kind === "trocar" && (
                <div className="gdb-input-row">
                  <span className="gdb-prompt-prefix" aria-hidden="true">
                    →
                  </span>
                  <input
                    type="text"
                    className="gdb-input"
                    aria-label="Substituição"
                    value={replacement}
                    autoComplete="off"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    enterKeyHint="send"
                    onChange={(e) => {
                      setReplacement(e.target.value);
                      setFeedback(null);
                    }}
                    onKeyDown={onEnter}
                  />
                </div>
              )}

              {liveError !== null && (
                <p className="regex-error" role="alert" data-testid="regex-error">
                  {liveError}
                </p>
              )}
            </div>
          )}

          {exercise.kind === "casar" && (
            <CasarLines item={exercise} evaluation={liveEval as CasarEval | null} idle={idle} />
          )}
          {exercise.kind === "extrair" && (
            <ExtrairLines item={exercise} evaluation={liveEval as ExtrairEval | null} idle={idle} />
          )}
          {exercise.kind === "trocar" && (
            <TrocarLines item={exercise} evaluation={liveEval as TrocarEval | null} idle={idle} />
          )}
          {exercise.kind === "ler" && (
            <LerLines
              item={exercise}
              selected={selected}
              revealed={false}
              evaluation={liveEval as LerEval}
              onToggle={(idx) => {
                setFeedback(null);
                setSelected((prev) =>
                  exercise.lines.map((_, i) => (i === idx ? prev[i] !== true : prev[i] === true)),
                );
              }}
            />
          )}

          <div className="actions">
            <button type="submit" className="primary gdb-send">
              {exercise.kind === "ler" ? "Conferir" : "Enviar"}
            </button>
          </div>
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
            ? "Lição concluída! Pronto para praticar regex livremente."
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
