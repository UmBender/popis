import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Clock } from "../core/clock";
import { textEvents, textPaceUnits, traceText, type KeyTrace } from "../stats/keytrace";
import { recordEvents } from "../storage/events";
import type { KeyValueStore } from "../storage/history";
import {
  appendTextResult,
  loadTextResults,
  loadTextSettings,
  saveTextSettings,
  type TextResult,
} from "../storage/text-typing";
import {
  loadTypingPace,
  saveConfigTarget,
  saveTypingPace,
  targetForConfig,
  textPaceKey,
  type TypingPaceStore,
} from "../storage/typing-pace";
import {
  evaluatePaceRound,
  ghostTextPosition,
  PACE_GOAL_STEPS,
  type PaceRoundSummary,
} from "../typing/pace";
import {
  initialWords,
  parseTextSettings,
  textConfigKey,
  textConfigLabel,
  TIME_LOOKAHEAD,
  TIME_OPTIONS,
  timeLimitMs,
  WORD_COUNT_OPTIONS,
  wordsFrom,
  type TextSettings,
} from "../typing/text";
import {
  appendWords,
  backspaceWord,
  clearWord,
  isWordsFinished,
  startWords,
  tick,
  typeWordsText,
  wordsStats,
  wordView,
  type LetterMark,
  type WordsState,
  type WordStatus,
} from "../typing/words-engine";
import { LIST_SIZES, TEXT_LANGUAGE_LABELS, TEXT_LANGUAGES } from "../typing/words";
import { seconds } from "./format";
import { matchTrainingKey } from "./keys";
import { detectPlateau, weeklyRate } from "../stats/learning";
import { RoundHistory } from "./shell/History";
import { PanelTitle, useRunning } from "./shell/panel";
import { Result } from "./shell/Result";
import { RoundBar } from "./shell/RoundBar";

type Props = {
  readonly clock: Clock;
  readonly store: KeyValueStore;
  /** Seed of each new text. */
  readonly newSeed: () => number;
  readonly onBack: () => void;
  /** Told when a text starts and ends, so the window hides the tree (T18). */
  readonly onRunning?: (running: boolean) => void;
  /** Jump to this item's section in Evolução (T23 AC-5). */
  readonly onProgress?: () => void;
};

const TICK_MS = 100;

/** One text being typed. `run` changes on every restart, to refocus the box. */
type Run = {
  readonly settings: TextSettings;
  readonly seed: number;
  readonly state: WordsState;
  /** The keys typed so far, for the events of the run (T22). */
  readonly trace: KeyTrace;
  /** Target-pace result once the run finishes (T29). */
  readonly paceSummary: PaceRoundSummary | null;
  readonly run: number;
};

function startRun(settings: TextSettings, seed: number, run: number): Run {
  const state = startWords(initialWords(seed, settings), {
    lenient: settings.lenientAccents,
    timeLimitMs: timeLimitMs(settings),
  });
  return { settings, seed, state, trace: [], paceSummary: null, run };
}

/** Text typing test, judged word by word (ADR-T12-1). */
export function TextTypingScreen({
  clock,
  store,
  newSeed,
  onBack,
  onRunning,
  onProgress,
}: Props): ReactNode {
  const [current, setCurrent] = useState<Run>(() =>
    startRun(loadTextSettings(store), newSeed(), 0),
  );
  const [results, setResults] = useState<readonly TextResult[]>(() => loadTextResults(store));
  const [pace, setPace] = useState<TypingPaceStore>(() => loadTypingPace(store));
  const [now, setNow] = useState(() => clock.now());
  // The latest run and pace settings, read by event handlers between renders.
  const latest = useRef(current);
  const paceRef = useRef(pace);
  const box = useRef<HTMLTextAreaElement>(null);
  const area = useRef<HTMLDivElement>(null);

  const show = useCallback((next: Run) => {
    latest.current = next;
    setCurrent(next);
  }, []);

  const updatePace = (nextPace: TypingPaceStore) => {
    paceRef.current = nextPace;
    saveTypingPace(store, nextPace);
    setPace(nextPace);
  };

  const apply = useCallback(
    (state: WordsState) => {
      const run = latest.current;
      if (state === run.state) return;
      const t = clock.now();
      setNow(t);
      let next = state;
      if (next.timeLimitMs !== null && next.words.length - next.current < TIME_LOOKAHEAD) {
        const more = wordsFrom(run.seed, run.settings, next.words.length, TIME_LOOKAHEAD);
        next = appendWords(next, more);
      }
      const trace = traceText(run.trace, run.state, next, t);
      let paceSummary = run.paceSummary;
      if (!isWordsFinished(run.state) && isWordsFinished(next)) {
        const { correct, incorrect, extra, missed, ...stats } = wordsStats(next);
        const at = clock.wallTime();
        const config = textConfigKey(run.settings);
        const paceKey = textPaceKey(run.settings);
        const priorWpms = loadTextResults(store)
          .filter((r) => r.config === config)
          .map((r) => r.wpm);
        const curPace = paceRef.current;
        const target = targetForConfig(curPace, paceKey, priorWpms);
        appendTextResult(store, {
          version: 1,
          config,
          seed: run.seed,
          wpm: stats.wpm,
          raw: stats.raw,
          accuracy: stats.accuracy,
          chars: { correct, incorrect, extra, missed },
          timeMs: stats.timeMs,
          finishedAt: at,
        });
        const events = textEvents(trace, { at, config, seed: run.seed, words: next.words, target });
        recordEvents(store, events, at);
        paceSummary = evaluatePaceRound(
          textPaceUnits(trace, next.words),
          target,
          stats.accuracy,
          curPace.goal,
        );
        const nextPace = saveConfigTarget(store, paceKey, paceSummary.nextTarget);
        paceRef.current = nextPace;
        setPace(nextPace);
        setResults(loadTextResults(store));
      }
      show({ ...run, state: next, trace, paceSummary });
    },
    [clock, show, store],
  );

  const { settings, seed, state } = current;
  const finished = isWordsFinished(state);
  const timed = state.timeLimitMs !== null;
  const running = state.startedAt !== null && !finished;
  useRunning(onRunning, running);

  useEffect(() => {
    box.current?.focus();
  }, [current.run]);

  useEffect(() => {
    if (!running || (!timed && !pace.enabled)) return;
    const id = setInterval(() => {
      const t = clock.now();
      setNow(t);
      apply(tick(latest.current.state, t));
    }, TICK_MS);
    return () => {
      clearInterval(id);
    };
  }, [apply, clock, pace.enabled, timed, running]);

  // Touch keyboards may send deletes without a Backspace keydown.
  useEffect(() => {
    // The box is always rendered, so it is set once the effect runs.
    const el = box.current as HTMLTextAreaElement;
    const onBeforeInput = (e: InputEvent) => {
      if (e.inputType === "deleteContentBackward") {
        e.preventDefault();
        apply(backspaceWord(latest.current.state));
      } else if (e.inputType === "deleteWordBackward") {
        e.preventDefault();
        apply(clearWord(latest.current.state));
      }
    };
    el.addEventListener("beforeinput", onBeforeInput);
    return () => {
      el.removeEventListener("beforeinput", onBeforeInput);
    };
  }, [apply]);

  // Keeps the current word on the second visible line.
  useLayoutEffect(() => {
    const word = area.current?.querySelector<HTMLElement>(".word-current");
    if (area.current && word) {
      area.current.scrollTop = Math.max(0, word.offsetTop - word.offsetHeight);
    }
  });

  const next = (nextSettings = latest.current.settings) => {
    show(startRun(nextSettings, newSeed(), latest.current.run + 1));
  };

  const exit = () => {
    const run = latest.current;
    show(startRun(run.settings, run.seed, run.run));
    box.current?.blur();
  };

  /** Applies an option from the form, validated like stored settings. */
  const change = (patch: Readonly<Record<string, unknown>>) => {
    const updated = parseTextSettings({ ...latest.current.settings, ...patch });
    saveTextSettings(store, updated);
    next(updated);
  };

  // One key at a time, so the trace sees every key of a burst.
  const typed = (text: string) => {
    for (const ch of text.replace(/[\r\n]/g, "").normalize("NFC")) {
      apply(typeWordsText(latest.current.state, ch, clock.now()));
    }
  };

  const view = wordView(state);
  const typedInCurrent = [...(state.inputs[state.current] ?? "")].length;
  const configKey = textConfigKey(settings);
  const historyMatched = results.filter((r) => r.config === configKey);
  const historyScores = historyMatched.map((r) => r.wpm);
  const historyPoints = historyMatched.map((r) => ({ at: r.finishedAt, score: r.wpm }));
  const historyRate = weeklyRate(historyPoints, clock.wallTime());
  const historyPlateau = detectPlateau(historyPoints);
  const activeTarget = targetForConfig(pace, textPaceKey(settings), historyScores);
  const ghost =
    pace.enabled && state.startedAt !== null && !finished
      ? ghostTextPosition(state.words, Math.max(0, now - state.startedAt), activeTarget)
      : null;
  const quote = settings.source === "quote";
  const remainingS = Math.ceil(
    state.startedAt === null || state.timeLimitMs === null
      ? settings.seconds
      : Math.max(0, state.startedAt + state.timeLimitMs - Math.max(now, state.startedAt)) / 1000,
  );
  const progress = timed
    ? `${String(remainingS)} s`
    : `${String(finished ? state.words.length : state.current)}/${String(state.words.length)}`;

  return (
    <div className="screen text-typing">
      <PanelTitle title="Texto">Digite as palavras; o tempo começa na primeira tecla.</PanelTitle>

      <div className="text-options" data-panel="options" role="group" aria-label="Opções">
        <label htmlFor="text-source">Tipo</label>
        <select
          id="text-source"
          value={settings.source}
          onChange={(e) => {
            change({ source: e.target.value });
          }}
        >
          <option value="words">Palavras</option>
          <option value="quote">Frase</option>
        </select>
        <label htmlFor="text-language">Idioma</label>
        <select
          id="text-language"
          value={settings.language}
          onChange={(e) => {
            change({ language: e.target.value });
          }}
        >
          {TEXT_LANGUAGES.map((l) => (
            <option key={l} value={l}>
              {TEXT_LANGUAGE_LABELS[l]}
            </option>
          ))}
        </select>
        <label htmlFor="text-list">Lista</label>
        <select
          id="text-list"
          value={settings.listSize}
          disabled={quote}
          onChange={(e) => {
            change({ listSize: Number(e.target.value) });
          }}
        >
          {LIST_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <label htmlFor="text-mode">Modo</label>
        <select
          id="text-mode"
          value={settings.mode}
          disabled={quote}
          onChange={(e) => {
            change({ mode: e.target.value });
          }}
        >
          <option value="time">Tempo</option>
          <option value="words">Palavras</option>
        </select>
        <label htmlFor="text-size">Tamanho</label>
        {settings.mode === "time" ? (
          <select
            id="text-size"
            value={settings.seconds}
            disabled={quote}
            onChange={(e) => {
              change({ seconds: Number(e.target.value) });
            }}
          >
            {TIME_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {`${String(s)} s`}
              </option>
            ))}
          </select>
        ) : (
          <select
            id="text-size"
            value={settings.wordCount}
            disabled={quote}
            onChange={(e) => {
              change({ wordCount: Number(e.target.value) });
            }}
          >
            {WORD_COUNT_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        )}
        <div className="text-flags">
          <Flag
            label="Pontuação"
            checked={settings.punctuation}
            disabled={quote}
            onChange={(punctuation) => {
              change({ punctuation });
            }}
          />
          <Flag
            label="Números"
            checked={settings.numbers}
            disabled={quote}
            onChange={(numbers) => {
              change({ numbers });
            }}
          />
          <Flag
            label="Acentos opcionais"
            checked={settings.lenientAccents}
            disabled={false}
            onChange={(lenientAccents) => {
              change({ lenientAccents });
            }}
          />
          <Flag
            label="Ritmo-alvo"
            checked={pace.enabled}
            disabled={false}
            onChange={(enabled) => {
              updatePace({ ...paceRef.current, enabled });
            }}
          />
          {pace.enabled && (
            <label className="pace-goal">
              Meta no ritmo
              <select
                aria-label="Meta no ritmo"
                value={String(pace.goal)}
                onChange={(e) => {
                  updatePace({ ...paceRef.current, goal: Number(e.target.value) });
                }}
              >
                {PACE_GOAL_STEPS.map((step) => (
                  <option key={step} value={String(step)}>
                    {`${String(Math.round(step * 100))}%`}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </div>

      <div className="text-area" data-panel="area">
        <RoundBar
          metrics={[
            ...(timed
              ? [
                  {
                    label: "tempo",
                    value: progress,
                    testId: "text-progress",
                    tone: "accent" as const,
                  },
                  { label: "palavras", value: state.current },
                ]
              : [
                  {
                    label: "palavras",
                    value: progress,
                    testId: "text-progress",
                    tone: "accent" as const,
                  },
                ]),
            ...(pace.enabled
              ? [{ label: "alvo", value: `${String(activeTarget)} WPM`, testId: "pace-target" }]
              : []),
          ]}
        />

        <div className="typing-area">
          <textarea
            ref={box}
            className="typing-input"
            aria-label="Texto digitado"
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
              const action = matchTrainingKey(e);
              if (action === "exit") {
                e.preventDefault();
                exit();
                return;
              }
              if (action === "skip" || action === "restart") {
                e.preventDefault();
                next();
                return;
              }
              switch (e.key) {
                case "Backspace":
                  e.preventDefault();
                  apply(
                    e.ctrlKey || e.altKey || e.metaKey
                      ? clearWord(latest.current.state)
                      : backspaceWord(latest.current.state),
                  );
                  break;
                case "Tab":
                  e.preventDefault();
                  break;
                case "Enter":
                  e.preventDefault();
                  break;
              }
            }}
          />
          <div
            ref={area}
            className="text-words"
            data-testid="text-words"
            onClick={() => {
              box.current?.focus();
            }}
          >
            {view.map((word, i) => (
              <Word
                key={i}
                index={i}
                status={word.status}
                chars={word.letters.map((l) => l.char).join("")}
                marks={word.letters.map((l) => MARK_CODES[l.mark]).join("")}
                cursor={!finished && i === state.current ? typedInCurrent : -1}
                ghost={ghost !== null && ghost.word === i ? ghost.letter : -1}
              />
            ))}
          </div>
        </div>

        {finished && (
          <TextResults
            state={state}
            settings={settings}
            seed={seed}
            paceSummary={current.paceSummary}
            onNext={() => {
              next();
            }}
          />
        )}
      </div>

      <RoundHistory
        scores={historyScores}
        unit="WPM"
        weeklyRate={historyRate}
        plateau={historyPlateau}
        onProgress={onProgress}
        testId="text-summary"
      />

      <div className="actions">
        <button type="button" onClick={onBack}>
          Voltar
        </button>
      </div>
    </div>
  );
}

function Flag({
  label,
  checked,
  disabled,
  onChange,
}: {
  readonly label: string;
  readonly checked: boolean;
  readonly disabled: boolean;
  readonly onChange: (checked: boolean) => void;
}): ReactNode {
  return (
    <label className="op">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => {
          onChange(e.target.checked);
        }}
      />
      {label}
    </label>
  );
}

const MARK_CODES: Readonly<Record<LetterMark, string>> = {
  correct: "c",
  incorrect: "i",
  extra: "e",
  pending: "p",
};
const MARKS_BY_CODE: Readonly<Record<string, LetterMark>> = {
  c: "correct",
  i: "incorrect",
  e: "extra",
  p: "pending",
};

/**
 * One word, one span per letter. Memoized on plain values: a key changes
 * one word, so the others skip rendering.
 */
const Word = memo(function Word({
  index,
  status,
  chars,
  marks,
  cursor,
  ghost,
}: {
  readonly index: number;
  readonly status: WordStatus;
  readonly chars: string;
  /** One code per letter: c(orrect), i(ncorrect), e(xtra) or p(ending). */
  readonly marks: string;
  /** Letter before which the cursor stands, or -1. */
  readonly cursor: number;
  /** Letter before which the ghost caret stands, `letters.length` for after-word, or -1. */
  readonly ghost: number;
}): ReactNode {
  const letters = [...chars];
  const classes = ["word", `word-${status}`];
  const ghostAfter = ghost === letters.length;
  if (ghostAfter) classes.push("ghost-cursor-after");
  if (cursor === letters.length) classes.push("cursor-after");
  return (
    <span
      className={classes.join(" ")}
      data-word={index}
      data-status={status}
      data-ghost={ghostAfter ? "true" : undefined}
    >
      {letters.map((ch, k) => {
        const mark = MARKS_BY_CODE[marks.charAt(k)] as LetterMark;
        const isGhost = k === ghost;
        return (
          <span
            key={k}
            data-mark={mark}
            data-ghost={isGhost ? "true" : undefined}
            className={`letter-${mark}${isGhost ? " ghost-cursor" : ""}${k === cursor ? " cursor" : ""}`}
          >
            {ch}
          </span>
        );
      })}
    </span>
  );
});

function TextResults({
  state,
  settings,
  seed,
  paceSummary,
  onNext,
}: {
  readonly state: WordsState;
  readonly settings: TextSettings;
  readonly seed: number;
  readonly paceSummary: PaceRoundSummary | null;
  readonly onNext: () => void;
}): ReactNode {
  const stats = wordsStats(state);
  const chars = [stats.correct, stats.incorrect, stats.extra, stats.missed].map(String).join("/");
  return (
    <Result
      headline={
        <>
          <strong data-testid="text-wpm">{Math.round(stats.wpm)}</strong> WPM
        </>
      }
      pairs={[
        { label: "bruto", value: Math.round(stats.raw), testId: "text-raw" },
        {
          label: "precisão",
          value: `${String(Math.round(stats.accuracy * 100))}%`,
          testId: "text-accuracy",
        },
        { label: "caracteres", value: chars, testId: "text-chars" },
        { label: "tempo", value: seconds(stats.timeMs), testId: "text-time" },
      ]}
      extra={
        paceSummary !== null && (
          <p className="pace-result" data-testid="text-pace-result">
            {`${String(Math.round(paceSummary.onPaceShare * 100))}% das palavras no ritmo · alvo ${String(paceSummary.target)} → ${String(paceSummary.nextTarget)} WPM`}
          </p>
        )
      }
      seed={
        <>
          <span data-testid="text-config">{textConfigLabel(settings)}</span> · seed{" "}
          <span data-testid="text-seed">{seed}</span>
        </>
      }
      onPlayAgain={onNext}
    />
  );
}
