import { memo, useEffect, useRef, useState, type ReactNode } from "react";
import type { Clock } from "../core/clock";
import { codeEvents, traceCode, type KeyTrace } from "../stats/keytrace";
import { detectPlateau, weeklyRate } from "../stats/learning";
import { recordEvents } from "../storage/events";
import type { KeyValueStore } from "../storage/history";
import {
  appendTypingResult,
  loadTypingLanguages,
  loadTypingResults,
  saveTypingLanguages,
  typingResultKind,
  type TypingResult,
} from "../storage/typing";
import {
  burstPaceKey,
  codePaceKey,
  loadTypingPace,
  saveConfigTarget,
  saveTypingPace,
  targetForConfig,
  type TypingPaceStore,
} from "../storage/typing-pace";
import {
  burstSummary,
  generateBurst,
  generateCodeSnippet,
  type BurstSnippet,
  type BurstSummary,
  type GeneratedSnippet,
} from "../typing/codegen";
import { LANGUAGE_LABELS, LANGUAGES, type Language } from "../typing/corpus";
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
import {
  evaluatePaceRound,
  ghostCodePosition,
  PACE_GOAL_STEPS,
  type PaceRoundSummary,
} from "../typing/pace";
import { seconds } from "./format";
import { matchTrainingKey } from "./keys";
import { RoundHistory } from "./shell/History";
import { PanelTitle, useRunning } from "./shell/panel";
import { Result } from "./shell/Result";
import { RoundBar } from "./shell/RoundBar";

const TICK_MS = 100;

type Props = {
  readonly clock: Clock;
  readonly store: KeyValueStore;
  /** Seed of each new snippet. */
  readonly newSeed: () => number;
  readonly onBack: () => void;
  /** Told when a snippet starts and ends, so the window hides the tree (T18). */
  readonly onRunning?: (running: boolean) => void;
  /** Jump to this item's section in Evolução (T23 AC-5). */
  readonly onProgress?: () => void;
};

type ActiveSnippet = GeneratedSnippet | BurstSnippet;

/** One snippet or burst being typed. `run` changes on every restart, to refocus the box. */
type Run = {
  readonly languages: readonly Language[];
  readonly burst: boolean;
  readonly seed: number;
  readonly snippet: ActiveSnippet;
  readonly typing: TypingState;
  /** The keys typed so far, for the events of the run (T22). */
  readonly trace: KeyTrace;
  /** Target-pace result once the run finishes (T29). */
  readonly paceSummary: PaceRoundSummary | null;
  /** Per-repetition summary once a Rajada run finishes (T31 AC-5). */
  readonly burstResult: BurstSummary | null;
  readonly run: number;
};

function paceKeyFor(languages: readonly Language[], burst: boolean): string {
  return burst ? burstPaceKey(languages) : codePaceKey(languages);
}

function matchingResults(
  results: readonly TypingResult[],
  languages: readonly Language[],
  burst: boolean,
): TypingResult[] {
  return results.filter(
    (r) => languages.includes(r.language) && (typingResultKind(r.snippetId) === "burst") === burst,
  );
}

function newRun(languages: readonly Language[], burst: boolean, seed: number, run: number): Run {
  const snippet: ActiveSnippet = burst
    ? generateBurst(seed, languages)
    : generateCodeSnippet(seed, languages);
  return {
    languages,
    burst,
    seed,
    snippet,
    typing: startTyping(snippet.text),
    trace: [],
    paceSummary: null,
    burstResult: null,
    run,
  };
}

/** Code typing test with generated snippets and Rajada bursts (ADR-T10-1, ADR-T31-1). */
export function TypingScreen({
  clock,
  store,
  newSeed,
  onBack,
  onRunning,
  onProgress,
}: Props): ReactNode {
  const [current, setCurrent] = useState<Run>(() =>
    newRun(loadTypingLanguages(store), false, newSeed(), 0),
  );
  const [results, setResults] = useState<readonly TypingResult[]>(() => loadTypingResults(store));
  const [pace, setPace] = useState<TypingPaceStore>(() => loadTypingPace(store));
  const [now, setNow] = useState(() => clock.now());
  // The latest run and pace settings, read by event handlers between renders.
  const latest = useRef(current);
  const paceRef = useRef(pace);
  const box = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    box.current?.focus();
  }, [current.run]);

  const show = (next: Run) => {
    latest.current = next;
    setCurrent(next);
  };

  const updatePace = (nextPace: TypingPaceStore) => {
    paceRef.current = nextPace;
    saveTypingPace(store, nextPace);
    setPace(nextPace);
  };

  const apply = (typing: TypingState) => {
    const run = latest.current;
    if (typing === run.typing) return;
    const t = clock.now();
    setNow(t);
    const trace = traceCode(run.trace, run.typing, typing, t);
    let paceSummary = run.paceSummary;
    let burstResult = run.burstResult;
    if (!isFinished(run.typing) && isFinished(typing)) {
      const stats = typingStats(typing);
      const at = clock.wallTime();
      const paceKey = paceKeyFor(run.languages, run.burst);
      const priorWpms = matchingResults(loadTypingResults(store), run.languages, run.burst).map(
        (r) => r.wpm,
      );
      const curPace = paceRef.current;
      const target = targetForConfig(curPace, paceKey, priorWpms);
      appendTypingResult(store, {
        version: 1,
        snippetId: run.snippet.id,
        language: run.snippet.language,
        seed: run.seed,
        ...stats,
        finishedAt: at,
      });
      const events = codeEvents(trace, {
        at,
        config: run.snippet.language,
        ...(run.burst ? { kc: `typing.idiom.${run.snippet.rule}` } : {}),
        seed: run.seed,
        snippetId: run.snippet.id,
        text: run.snippet.text,
        target,
      });
      recordEvents(store, events, at);
      paceSummary = evaluatePaceRound(
        events.map((e) => e.extra["onPace"] === true),
        target,
        stats.accuracy,
        curPace.goal,
      );
      burstResult = run.burst ? burstSummary(events.map((e) => e.timeMs)) : null;
      const nextPace = saveConfigTarget(store, paceKey, paceSummary.nextTarget);
      paceRef.current = nextPace;
      setPace(nextPace);
      setResults(loadTypingResults(store));
    }
    show({ ...run, typing, trace, paceSummary, burstResult });
  };

  const next = (languages = latest.current.languages, burst = latest.current.burst) => {
    show(newRun(languages, burst, newSeed(), latest.current.run + 1));
  };

  const exit = () => {
    const run = latest.current;
    show({
      ...run,
      typing: startTyping(run.snippet.text),
      trace: [],
      paceSummary: null,
      burstResult: null,
    });
    box.current?.blur();
  };

  const toggle = (language: Language) => {
    const checked = latest.current.languages;
    const languages = checked.includes(language)
      ? checked.filter((l) => l !== language)
      : LANGUAGES.filter((l) => l === language || checked.includes(l));
    saveTypingLanguages(store, languages);
    next(languages, latest.current.burst);
  };

  const toggleBurst = (nextBurst: boolean) => {
    next(latest.current.languages, nextBurst);
  };

  const typed = (text: string) => {
    apply(typeText(latest.current.typing, text.replaceAll("\r", ""), clock.now()));
  };

  const { snippet, typing, languages, burst, seed } = current;
  const finished = isFinished(typing);
  const running = typing.typed.length > 0 && !finished;
  const markCodes = marks(typing)
    .map((m) => MARK_CODES[m])
    .join("");
  useRunning(onRunning, running);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setNow(clock.now());
    }, TICK_MS);
    return () => {
      clearInterval(id);
    };
  }, [clock, running]);

  const elapsedS =
    typing.startedAt === null
      ? 0
      : Math.floor(Math.max(0, (typing.finishedAt ?? now) - typing.startedAt) / 1000);
  const historyMatched = matchingResults(results, languages, burst);
  const historyScores = historyMatched.map((r) => r.wpm);
  const historyPoints = historyMatched.map((r) => ({ at: r.finishedAt, score: r.wpm }));
  const historyRate = weeklyRate(historyPoints, clock.wallTime());
  const historyPlateau = detectPlateau(historyPoints);
  const activeTarget = targetForConfig(pace, paceKeyFor(languages, burst), historyScores);
  const ghostPos =
    pace.enabled && typing.startedAt !== null && !finished
      ? ghostCodePosition(snippet.text, Math.max(0, now - typing.startedAt), activeTarget)
      : -1;

  return (
    <div className="screen typing">
      <PanelTitle title="Código">
        Digite o trecho de código; o tempo começa na primeira tecla.
      </PanelTitle>

      <div className="typing-options" data-panel="options">
        <div className="options-row" role="group" aria-label="Linguagens">
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
          <label className="op">
            <input
              type="checkbox"
              checked={burst}
              onChange={(e) => {
                toggleBurst(e.target.checked);
              }}
            />
            Rajada (5×)
          </label>
        </div>
        <div className="options-row" role="group" aria-label="Ritmo-alvo">
          <label className="op">
            <input
              type="checkbox"
              checked={pace.enabled}
              onChange={(e) => {
                updatePace({ ...paceRef.current, enabled: e.target.checked });
              }}
            />
            Ritmo-alvo
          </label>
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

      <div className="typing-area" data-panel="area">
        <RoundBar
          metrics={[
            { label: "tempo", value: `${String(elapsedS)} s`, tone: "accent" },
            { label: "erros", value: typing.keystrokes - typing.correct },
            ...(pace.enabled
              ? [{ label: "alvo", value: `${String(activeTarget)} WPM`, testId: "pace-target" }]
              : []),
          ]}
        />
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
              case "Enter":
                e.preventDefault();
                apply(pressEnter(latest.current.typing, clock.now()));
                break;
              case "Backspace":
                e.preventDefault();
                apply(backspace(latest.current.typing));
                break;
              case "Tab":
                e.preventDefault();
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
              ghost={ghostPos >= 0 ? ghostPos - start : -1}
            />
          ))}
        </pre>

        {finished && (
          <TypingResults
            typing={typing}
            snippet={snippet}
            seed={seed}
            paceSummary={current.paceSummary}
            burstResult={current.burstResult}
            onNext={next}
          />
        )}
      </div>

      <RoundHistory
        scores={historyScores}
        unit="WPM"
        weeklyRate={historyRate}
        plateau={historyPlateau}
        onProgress={onProgress}
        testId="typing-summary"
      />

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
  ghost,
}: {
  readonly text: string;
  /** One code per character: c(orrect), w(rong) or p(ending). */
  readonly marks: string;
  /** Column of the cursor in this line, or outside [0, length) when absent. */
  readonly cursor: number;
  /** Column of the ghost caret in this line, or outside [0, length) when absent. */
  readonly ghost: number;
}): ReactNode {
  return [...text].map((ch, i) => {
    const mark = MARKS_BY_CODE[marks.charAt(i)] ?? "pending";
    const isGhost = i === ghost;
    const classes = [`mark-${mark}`];
    if (ch === " ") classes.push("space");
    if (isGhost) classes.push("ghost-cursor");
    if (i === cursor) classes.push("cursor");
    return (
      <span
        key={i}
        data-mark={mark}
        data-ghost={isGhost ? "true" : undefined}
        className={classes.join(" ")}
      >
        {ch === "\n" && mark === "wrong" ? "↵\n" : ch}
      </span>
    );
  });
});

function formatRatio(ratio: number | null): string {
  return ratio === null ? "—" : `${ratio.toFixed(2).replace(".", ",")}×`;
}

function TypingResults({
  typing,
  snippet,
  seed,
  paceSummary,
  burstResult,
  onNext,
}: {
  readonly typing: TypingState;
  readonly snippet: ActiveSnippet;
  readonly seed: number;
  readonly paceSummary: PaceRoundSummary | null;
  readonly burstResult: BurstSummary | null;
  readonly onNext: () => void;
}): ReactNode {
  const stats = typingStats(typing);
  return (
    <Result
      headline={
        <>
          <strong data-testid="wpm">{Math.round(stats.wpm)}</strong> WPM
        </>
      }
      pairs={[
        {
          label: "precisão",
          value: `${String(Math.round(stats.accuracy * 100))}%`,
          testId: "accuracy",
        },
        { label: "erros", value: stats.errors, testId: "errors" },
        { label: "tempo", value: seconds(stats.timeMs), testId: "time" },
      ]}
      extra={
        <>
          {burstResult !== null && (
            <div className="burst-result" data-testid="burst-result">
              <ol className="burst-reps" data-testid="burst-reps">
                {burstResult.timesMs.map((ms, i) => (
                  <li key={i} data-testid="burst-rep">
                    <span>{`${String(i + 1)}ª`}</span> {seconds(ms)}
                  </li>
                ))}
              </ol>
              <p className="burst-ratio" data-testid="burst-ratio">
                {`última/primeira: ${formatRatio(burstResult.ratio)}`}
              </p>
            </div>
          )}
          {paceSummary !== null && (
            <p className="pace-result" data-testid="typing-pace-result">
              {`${String(Math.round(paceSummary.onPaceShare * 100))}% das linhas no ritmo · alvo ${String(paceSummary.target)} → ${String(paceSummary.nextTarget)} WPM`}
            </p>
          )}
        </>
      }
      seed={
        <>
          trecho <span data-testid="snippet-id">{snippet.id}</span> · seed{" "}
          <span data-testid="typing-seed">{seed}</span>
        </>
      }
      onPlayAgain={() => {
        onNext();
      }}
    />
  );
}
