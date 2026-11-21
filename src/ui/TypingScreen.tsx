import { memo, useEffect, useRef, useState, type ReactNode } from "react";
import type { Clock } from "../core/clock";
import { codeEvents, traceCode, type KeyTrace } from "../stats/keytrace";
import { recordEvents } from "../storage/events";
import type { KeyValueStore } from "../storage/history";
import {
  appendTypingResult,
  loadTypingLanguages,
  loadTypingResults,
  saveTypingLanguages,
  typingSummary,
  type TypingResult,
} from "../storage/typing";
import {
  LANGUAGE_LABELS,
  LANGUAGES,
  pickSnippet,
  type Language,
  type Snippet,
} from "../typing/corpus";
import {
  backspace,
  isFinished,
  marks,
  pressEnter,
  startTyping,
  typeText,
  typingStats,
  type Mark,
  type TypingState,
} from "../typing/engine";
import { seconds } from "./format";
import { PanelTitle, useRunning } from "./shell/panel";

type Props = {
  readonly clock: Clock;
  readonly store: KeyValueStore;
  /** Seed of each new snippet. */
  readonly newSeed: () => number;
  readonly onBack: () => void;
  /** Told when a snippet starts and ends, so the window hides the tree (T18). */
  readonly onRunning?: (running: boolean) => void;
};

/** One snippet being typed. `run` changes on every restart, to refocus the box. */
type Run = {
  readonly languages: readonly Language[];
  readonly seed: number;
  readonly snippet: Snippet;
  readonly typing: TypingState;
  /** The keys typed so far, for the events of the run (T22). */
  readonly trace: KeyTrace;
  readonly run: number;
};

function newRun(languages: readonly Language[], seed: number, run: number): Run {
  const snippet = pickSnippet(seed, languages);
  return { languages, seed, snippet, typing: startTyping(snippet.text), trace: [], run };
}

/** Code typing test, apart from the game engine (ADR-T10-1). */
export function TypingScreen({ clock, store, newSeed, onBack, onRunning }: Props): ReactNode {
  const [current, setCurrent] = useState<Run>(() =>
    newRun(loadTypingLanguages(store), newSeed(), 0),
  );
  const [results, setResults] = useState<readonly TypingResult[]>(() => loadTypingResults(store));
  // The latest run, read by the event handlers between renders.
  const latest = useRef(current);
  const box = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    box.current?.focus();
  }, [current.run]);

  const show = (next: Run) => {
    latest.current = next;
    setCurrent(next);
  };

  const apply = (typing: TypingState) => {
    const run = latest.current;
    if (typing === run.typing) return;
    const trace = traceCode(run.trace, run.typing, typing, clock.now());
    if (!isFinished(run.typing) && isFinished(typing)) {
      const stats = typingStats(typing);
      const at = clock.wallTime();
      appendTypingResult(store, {
        version: 1,
        snippetId: run.snippet.id,
        language: run.snippet.language,
        seed: run.seed,
        ...stats,
        finishedAt: at,
      });
      const meta = {
        at,
        config: run.snippet.language,
        seed: run.seed,
        snippetId: run.snippet.id,
      };
      recordEvents(store, codeEvents(trace, meta), at);
      setResults(loadTypingResults(store));
    }
    show({ ...run, typing, trace });
  };

  const next = (languages = latest.current.languages) => {
    show(newRun(languages, newSeed(), latest.current.run + 1));
  };

  const restart = () => {
    const run = latest.current;
    show({ ...run, typing: startTyping(run.snippet.text), trace: [], run: run.run + 1 });
  };

  const toggle = (language: Language) => {
    const checked = latest.current.languages;
    const languages = checked.includes(language)
      ? checked.filter((l) => l !== language)
      : LANGUAGES.filter((l) => l === language || checked.includes(l));
    saveTypingLanguages(store, languages);
    next(languages);
  };

  const typed = (text: string) => {
    apply(typeText(latest.current.typing, text.replaceAll("\r", ""), clock.now()));
  };

  const { snippet, typing, languages, seed } = current;
  const finished = isFinished(typing);
  const summary = typingSummary(results);
  const markCodes = marks(typing)
    .map((m) => MARK_CODES[m])
    .join("");
  useRunning(onRunning, typing.typed.length > 0 && !finished);

  return (
    <div className="screen typing">
      <PanelTitle title="Digitação">
        Digite o trecho de código; o tempo começa na primeira tecla.
      </PanelTitle>

      <fieldset className="modes" data-panel="options">
        <legend>Linguagens</legend>
        {LANGUAGES.map((language) => (
          <label key={language} className="op">
            <input
              type="checkbox"
              checked={languages.includes(language)}
              disabled={languages.length === 1 && languages.includes(language)}
              onChange={() => {
                toggle(language);
              }}
            />
            {LANGUAGE_LABELS[language]}
          </label>
        ))}
      </fieldset>

      <div className="typing-area" data-panel="area">
        <textarea
          ref={box}
          className="typing-input"
          aria-label="Código digitado"
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
              case "Enter":
                e.preventDefault();
                if (e.ctrlKey || e.metaKey) restart();
                else apply(pressEnter(latest.current.typing, clock.now()));
                break;
              case "Backspace":
                e.preventDefault();
                apply(backspace(latest.current.typing));
                break;
              case "Tab":
                e.preventDefault();
                break;
              case "Escape":
                e.preventDefault();
                next();
                break;
            }
          }}
        />
        <pre
          className="typing-code"
          data-testid="typing-code"
          data-snippet-id={snippet.id}
          onClick={() => {
            box.current?.focus();
          }}
        >
          {lines(snippet.text).map(({ start, text }) => (
            <Line
              key={start}
              text={text}
              marks={markCodes.slice(start, start + text.length)}
              cursor={!finished ? typing.typed.length - start : -1}
            />
          ))}
        </pre>

        {finished ? (
          <TypingResults typing={typing} snippet={snippet} seed={seed} onNext={next} />
        ) : (
          <p className="muted hint">
            Enter quebra a linha e indenta · Esc troca o trecho · Ctrl+Enter recomeça.
          </p>
        )}
      </div>

      <div data-testid="typing-summary" className="typing-summary" data-panel="history">
        {LANGUAGES.map((language) => {
          const s = summary[language];
          return (
            <p key={language} data-testid={`summary-${language}`} className="muted">
              {s === null
                ? `${LANGUAGE_LABELS[language]}: sem resultados`
                : `${LANGUAGE_LABELS[language]}: melhor ${String(Math.round(s.best))} WPM · ` +
                  `média dos últimos 10: ${String(Math.round(s.recentMean))} WPM`}
            </p>
          );
        })}
      </div>

      <div className="actions">
        <button type="button" onClick={onBack}>
          Voltar
        </button>
      </div>
    </div>
  );
}

const MARK_CODES: Readonly<Record<Mark, string>> = { correct: "c", wrong: "w", pending: "p" };
const MARKS_BY_CODE: Readonly<Record<string, Mark>> = { c: "correct", w: "wrong", p: "pending" };

/** The snippet's lines, each with its trailing newline and its offset. */
function lines(text: string): { start: number; text: string }[] {
  const out: { start: number; text: string }[] = [];
  let start = 0;
  for (const line of text.split(/(?<=\n)/)) {
    out.push({ start, text: line });
    start += line.length;
  }
  return out;
}

/**
 * One line of the snippet, one span per character. Memoized on plain
 * strings: a key changes one line, so the others skip rendering.
 */
const Line = memo(function Line({
  text,
  marks,
  cursor,
}: {
  readonly text: string;
  /** One code per character: c(orrect), w(rong) or p(ending). */
  readonly marks: string;
  /** Column of the cursor in this line, or outside [0, length) when absent. */
  readonly cursor: number;
}): ReactNode {
  return [...text].map((ch, i) => {
    const mark = MARKS_BY_CODE[marks.charAt(i)] ?? "pending";
    const classes = [`mark-${mark}`];
    if (ch === " ") classes.push("space");
    if (i === cursor) classes.push("cursor");
    return (
      <span key={i} data-mark={mark} className={classes.join(" ")}>
        {ch === "\n" && mark === "wrong" ? "↵\n" : ch}
      </span>
    );
  });
});

function TypingResults({
  typing,
  snippet,
  seed,
  onNext,
}: {
  readonly typing: TypingState;
  readonly snippet: Snippet;
  readonly seed: number;
  readonly onNext: () => void;
}): ReactNode {
  const stats = typingStats(typing);
  return (
    <div className="typing-results">
      <p className="score">
        <strong data-testid="wpm">{Math.round(stats.wpm)}</strong> WPM · precisão{" "}
        <span data-testid="accuracy">{`${String(Math.round(stats.accuracy * 100))}%`}</span> · erros{" "}
        <span data-testid="errors">{stats.errors}</span> · tempo{" "}
        <span data-testid="time">{seconds(stats.timeMs)}</span>
      </p>
      <p className="seed">
        trecho <span data-testid="snippet-id">{snippet.id}</span> · seed{" "}
        <span data-testid="typing-seed">{seed}</span>
      </p>
      <button
        type="button"
        className="primary"
        autoFocus
        onClick={() => {
          onNext();
        }}
      >
        Próximo
      </button>
    </div>
  );
}
