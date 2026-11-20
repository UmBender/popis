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
import type { KeyValueStore } from "../storage/history";
import {
  appendTextResult,
  loadTextResults,
  loadTextSettings,
  saveTextSettings,
  textSummary,
  type TextResult,
} from "../storage/text-typing";
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

type Props = {
  readonly clock: Clock;
  readonly store: KeyValueStore;
  /** Seed of each new text. */
  readonly newSeed: () => number;
  readonly onBack: () => void;
};

const TICK_MS = 100;

/** One text being typed. `run` changes on every restart, to refocus the box. */
type Run = {
  readonly settings: TextSettings;
  readonly seed: number;
  readonly state: WordsState;
  readonly run: number;
};

function startRun(settings: TextSettings, seed: number, run: number): Run {
  const state = startWords(initialWords(seed, settings), {
    lenient: settings.lenientAccents,
    timeLimitMs: timeLimitMs(settings),
  });
  return { settings, seed, state, run };
}

/** Text typing test, judged word by word (ADR-T12-1). */
export function TextTypingScreen({ clock, store, newSeed, onBack }: Props): ReactNode {
  const [current, setCurrent] = useState<Run>(() =>
    startRun(loadTextSettings(store), newSeed(), 0),
  );
  const [results, setResults] = useState<readonly TextResult[]>(() => loadTextResults(store));
  const [now, setNow] = useState(() => clock.now());
  // The latest run, read by the event handlers between renders.
  const latest = useRef(current);
  const box = useRef<HTMLTextAreaElement>(null);
  const area = useRef<HTMLDivElement>(null);

  const show = useCallback((next: Run) => {
    latest.current = next;
    setCurrent(next);
  }, []);

  const apply = useCallback(
    (state: WordsState) => {
      const run = latest.current;
      if (state === run.state) return;
      let next = state;
      if (next.timeLimitMs !== null && next.words.length - next.current < TIME_LOOKAHEAD) {
        const more = wordsFrom(run.seed, run.settings, next.words.length, TIME_LOOKAHEAD);
        next = appendWords(next, more);
      }
      if (!isWordsFinished(run.state) && isWordsFinished(next)) {
        const { correct, incorrect, extra, missed, ...stats } = wordsStats(next);
        appendTextResult(store, {
          version: 1,
          config: textConfigKey(run.settings),
          seed: run.seed,
          wpm: stats.wpm,
          raw: stats.raw,
          accuracy: stats.accuracy,
          chars: { correct, incorrect, extra, missed },
          timeMs: stats.timeMs,
          finishedAt: clock.wallTime(),
        });
        setResults(loadTextResults(store));
      }
      show({ ...run, state: next });
    },
    [clock, show, store],
  );

  const { settings, seed, state } = current;
  const finished = isWordsFinished(state);
  const timed = state.timeLimitMs !== null;
  const running = state.startedAt !== null && !finished;

  useEffect(() => {
    box.current?.focus();
  }, [current.run]);

  useEffect(() => {
    if (!timed || !running) return;
    const id = setInterval(() => {
      const t = clock.now();
      setNow(t);
      apply(tick(latest.current.state, t));
    }, TICK_MS);
    return () => {
      clearInterval(id);
    };
  }, [apply, clock, timed, running]);

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

  const restart = () => {
    const run = latest.current;
    show(startRun(run.settings, run.seed, run.run + 1));
  };

  /** Applies an option from the form, validated like stored settings. */
  const change = (patch: Readonly<Record<string, unknown>>) => {
    const updated = parseTextSettings({ ...latest.current.settings, ...patch });
    saveTextSettings(store, updated);
    next(updated);
  };

  const typed = (text: string) => {
    apply(typeWordsText(latest.current.state, text.replace(/[\r\n]/g, ""), clock.now()));
  };

  const view = wordView(state);
  const typedInCurrent = [...(state.inputs[state.current] ?? "")].length;
  const summary = textSummary(results, textConfigKey(settings));
  const quote = settings.source === "quote";
  const remainingS = Math.ceil(
    state.startedAt === null || state.timeLimitMs === null
      ? settings.seconds
      : Math.max(0, state.startedAt + state.timeLimitMs - Math.max(now, state.startedAt)) / 1000,
  );
  const progress = timed
    ? String(remainingS)
    : `${String(finished ? state.words.length : state.current)}/${String(state.words.length)}`;

  return (
    <div className="screen text-typing">
      <h1>Texto</h1>

      <p className="text-progress" data-testid="text-progress">
        {progress}
      </p>

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
                restart();
                break;
              case "Escape":
                e.preventDefault();
                next();
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
            />
          ))}
        </div>
      </div>

      {finished ? (
        <TextResults
          state={state}
          settings={settings}
          seed={seed}
          onNext={() => {
            next();
          }}
        />
      ) : (
        <p className="muted hint">Esc troca o texto · Tab recomeça.</p>
      )}

      <fieldset className="text-options">
        <legend>Opções</legend>
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
        </div>
      </fieldset>

      <p data-testid="text-summary" className="muted typing-summary">
        {summary === null
          ? "Sem resultados nesta configuração."
          : `melhor ${String(Math.round(summary.best))} WPM · ` +
            `média dos últimos 10: ${String(Math.round(summary.recentMean))} WPM`}
      </p>

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
}: {
  readonly index: number;
  readonly status: WordStatus;
  readonly chars: string;
  /** One code per letter: c(orrect), i(ncorrect), e(xtra) or p(ending). */
  readonly marks: string;
  /** Letter before which the cursor stands, or -1. */
  readonly cursor: number;
}): ReactNode {
  const letters = [...chars];
  const classes = ["word", `word-${status}`];
  if (cursor === letters.length) classes.push("cursor-after");
  return (
    <span className={classes.join(" ")} data-word={index} data-status={status}>
      {letters.map((ch, k) => {
        const mark = MARKS_BY_CODE[marks.charAt(k)] as LetterMark;
        return (
          <span
            key={k}
            data-mark={mark}
            className={`letter-${mark}${k === cursor ? " cursor" : ""}`}
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
  onNext,
}: {
  readonly state: WordsState;
  readonly settings: TextSettings;
  readonly seed: number;
  readonly onNext: () => void;
}): ReactNode {
  const stats = wordsStats(state);
  const chars = [stats.correct, stats.incorrect, stats.extra, stats.missed].map(String).join("/");
  return (
    <div className="typing-results">
      <p className="score">
        <strong data-testid="text-wpm">{Math.round(stats.wpm)}</strong> WPM · bruto{" "}
        <span data-testid="text-raw">{Math.round(stats.raw)}</span> · precisão{" "}
        <span data-testid="text-accuracy">{`${String(Math.round(stats.accuracy * 100))}%`}</span>
      </p>
      <p className="muted">
        caracteres (certos/errados/a mais/faltando) <span data-testid="text-chars">{chars}</span> ·
        tempo <span data-testid="text-time">{seconds(stats.timeMs)}</span>
      </p>
      <p className="seed">
        <span data-testid="text-config">{textConfigLabel(settings)}</span> · seed{" "}
        <span data-testid="text-seed">{seed}</span>
      </p>
      <button type="button" className="primary" autoFocus onClick={onNext}>
        Próximo
      </button>
    </div>
  );
}
