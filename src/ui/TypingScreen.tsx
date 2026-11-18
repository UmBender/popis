import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Clock } from "../core/clock";
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
  type TypingState,
} from "../typing/engine";
import { seconds } from "./format";

type Props = {
  readonly clock: Clock;
  readonly store: KeyValueStore;
  /** Seed of each new snippet. */
  readonly newSeed: () => number;
  readonly onBack: () => void;
};

/** One snippet being typed. `run` changes on every restart, to refocus the box. */
type Run = {
  readonly languages: readonly Language[];
  readonly seed: number;
  readonly snippet: Snippet;
  readonly typing: TypingState;
  readonly run: number;
};

function newRun(languages: readonly Language[], seed: number, run: number): Run {
  const snippet = pickSnippet(seed, languages);
  return { languages, seed, snippet, typing: startTyping(snippet.text), run };
}

/** Code typing test, apart from the game engine (ADR-T10-1). */
export function TypingScreen({ clock, store, newSeed, onBack }: Props): ReactNode {
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
    if (!isFinished(run.typing) && isFinished(typing)) {
      const stats = typingStats(typing);
      appendTypingResult(store, {
        version: 1,
        snippetId: run.snippet.id,
        language: run.snippet.language,
        seed: run.seed,
        ...stats,
        finishedAt: clock.wallTime(),
      });
      setResults(loadTypingResults(store));
    }
    show({ ...run, typing });
  };

  const next = (languages = latest.current.languages) => {
    show(newRun(languages, newSeed(), latest.current.run + 1));
  };

  const restart = () => {
    const run = latest.current;
    show({ ...run, typing: startTyping(run.snippet.text), run: run.run + 1 });
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
    if (text !== "") apply(typeText(latest.current.typing, text.replaceAll("\r", ""), clock.now()));
  };

  const { snippet, typing, languages, seed } = current;
  const finished = isFinished(typing);
  const summary = typingSummary(results);

  return (
    <div className="screen typing">
      <h1>Digitação</h1>

      <fieldset className="modes">
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

      <div className="typing-area">
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
          {marks(typing).map((mark, i) => {
            const ch = snippet.text[i] ?? "";
            const classes = [`mark-${mark}`];
            if (ch === " ") classes.push("space");
            if (!finished && i === typing.typed.length) classes.push("cursor");
            return (
              <span key={i} data-mark={mark} className={classes.join(" ")}>
                {ch === "\n" && mark === "wrong" ? "↵\n" : ch}
              </span>
            );
          })}
        </pre>
      </div>

      {finished ? (
        <TypingResults typing={typing} snippet={snippet} seed={seed} onNext={next} />
      ) : (
        <p className="muted hint">
          Enter quebra a linha e indenta · Esc troca o trecho · Ctrl+Enter recomeça.
        </p>
      )}

      <div data-testid="typing-summary" className="typing-summary">
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
