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
import { traceText, type KeyTrace } from "../stats/keytrace";
import { quartiles } from "../stats/summary";
import { ngramIntervals, selectWeakSpots, type WeakTarget } from "../stats/weak";
import { loadEvents, recordEvents } from "../storage/events";
import type { KeyValueStore } from "../storage/history";
import { loadTextResults } from "../storage/text-typing";
import { loadTypingResults } from "../storage/typing";
import { loadTypingPace, saveTypingPace, type TypingPaceStore } from "../storage/typing-pace";
import { ghostTextPosition, initialTargetWpm, targetIntervalMs } from "../typing/pace";
import {
  currentWeakTarget,
  finishWeakBlock,
  startWeakRound,
  summarizeWeakRound,
  WEAK_BLOCK_MS,
  WEAK_BLOCK_SECONDS,
  weakEvents,
  type WeakBlockSummary,
  type WeakRoundState,
} from "../typing/weak-round";
import { WEAK_WORDS_PER_LINE, weakWordsFrom } from "../typing/weak-text";
import {
  appendWords,
  backspaceWord,
  clearWord,
  isWordsFinished,
  startWords,
  tick,
  typeWordsText,
  wordView,
  type LetterMark,
  type WordsState,
  type WordStatus,
} from "../typing/words-engine";
import { matchTrainingKey } from "./keys";
import { PanelTitle, useRunning } from "./shell/panel";
import { Result } from "./shell/Result";
import { RoundBar } from "./shell/RoundBar";

export type WeakTypingScreenProps = {
  readonly clock: Clock;
  readonly store: KeyValueStore;
  readonly newSeed: () => number;
  readonly onBack: () => void;
  readonly onRunning?: (running: boolean) => void;
  readonly onOpenText: () => void;
};

const TICK_MS = 100;
const INITIAL_LINES = 8;
const LOOKAHEAD_WORDS = WEAK_WORDS_PER_LINE * 4;
const APPEND_LINES = 4;

type ActiveRun = {
  readonly roundSeed: number;
  readonly round: WeakRoundState;
  readonly blockSeed: number;
  readonly linesGenerated: number;
  readonly state: WordsState;
  readonly trace: KeyTrace;
  readonly lastBlock: WeakBlockSummary | null;
  readonly run: number;
};

function resolveTargetWpm(store: KeyValueStore, pace: TypingPaceStore): number {
  const storedTargets = Object.values(pace.targets);
  if (storedTargets.length > 0) return initialTargetWpm(storedTargets);
  const recentWpms = [...loadTextResults(store), ...loadTypingResults(store)]
    .sort((a, b) => a.finishedAt - b.finishedAt)
    .map((r) => r.wpm);
  return initialTargetWpm(recentWpms);
}

function makeBlockState(ngram: string, seed: number): WordsState {
  return startWords(weakWordsFrom(ngram, seed, 0, INITIAL_LINES), {
    lenient: false,
    timeLimitMs: WEAK_BLOCK_MS,
  });
}

function initRun(
  store: KeyValueStore,
  pace: TypingPaceStore,
  nowWall: number,
  newSeed: () => number,
  run: number,
): ActiveRun | null {
  const selection = selectWeakSpots(loadEvents(store), nowWall);
  if (selection.targets.length === 0) return null;
  const roundSeed = newSeed();
  const blockSeed = newSeed();
  const round = startWeakRound(selection.targets, resolveTargetWpm(store, pace));
  const first = currentWeakTarget(round) as WeakTarget;
  return {
    roundSeed,
    round,
    blockSeed,
    linesGenerated: INITIAL_LINES,
    state: makeBlockState(first.ngram, blockSeed),
    trace: [],
    lastBlock: null,
    run,
  };
}

function formatMs(ms: number | null): string {
  return ms === null ? "—" : `${String(Math.round(ms))} ms`;
}

/** Highlight flags for every occurrence of `needle` inside `letters`. */
function highlightMask(letters: readonly string[], needle: readonly string[]): boolean[] {
  const mask = Array.from({ length: letters.length }, () => false);
  const len = needle.length;
  for (let i = 0; i + len <= letters.length; i++) {
    let match = true;
    for (let j = 0; j < len; j++) {
      if (letters[i + j] !== needle[j]) {
        match = false;
        break;
      }
    }
    if (match) {
      for (let j = 0; j < len; j++) mask[i + j] = true;
    }
  }
  return mask;
}

/** Weak-spots typing drill: 5 × 30s blocks targeting slowest n-grams and error chars (ADR-T30-1). */
export function WeakTypingScreen({
  clock,
  store,
  newSeed,
  onBack,
  onRunning,
  onOpenText,
}: WeakTypingScreenProps): ReactNode {
  const [pace, setPace] = useState<TypingPaceStore>(() => loadTypingPace(store));
  const [current, setCurrent] = useState<ActiveRun | null>(() =>
    initRun(store, loadTypingPace(store), clock.wallTime(), newSeed, 0),
  );
  const [now, setNow] = useState(() => clock.now());
  const latest = useRef(current);
  const paceRef = useRef(pace);
  const box = useRef<HTMLTextAreaElement>(null);
  const area = useRef<HTMLDivElement>(null);

  const show = useCallback((next: ActiveRun | null) => {
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
      if (run === null || run.round.finished || state === run.state) return;
      const t = clock.now();
      setNow(t);
      const active = currentWeakTarget(run.round) as WeakTarget;
      let next = state;
      let linesGenerated = run.linesGenerated;
      if (next.words.length - next.current < LOOKAHEAD_WORDS) {
        const more = weakWordsFrom(active.ngram, run.blockSeed, linesGenerated, APPEND_LINES);
        next = appendWords(next, more);
        linesGenerated += APPEND_LINES;
      }
      const trace = traceText(run.trace, run.state, next, t);

      if (!isWordsFinished(run.state) && isWordsFinished(next)) {
        const at = clock.wallTime();
        const events = weakEvents(trace, {
          at,
          seed: run.blockSeed,
          words: next.words,
          ngram: active.ngram,
          target: run.round.targetWpm,
        });
        recordEvents(store, events, at);
        const samples = ngramIntervals(events, active.ngram);
        const afterMedianMs = samples.length > 0 ? quartiles(samples)[1] : null;
        const accuracy = next.correctKeystrokes / next.keystrokes;
        const nextRound = finishWeakBlock(run.round, { afterMedianMs, accuracy });
        const lastBlock = nextRound.blocks[nextRound.blocks.length - 1] as WeakBlockSummary;

        if (nextRound.finished) {
          show({ ...run, round: nextRound, state: next, trace, linesGenerated, lastBlock });
          return;
        }
        const nextTarget = currentWeakTarget(nextRound) as WeakTarget;
        const nextBlockSeed = newSeed();
        show({
          ...run,
          round: nextRound,
          blockSeed: nextBlockSeed,
          linesGenerated: INITIAL_LINES,
          state: makeBlockState(nextTarget.ngram, nextBlockSeed),
          trace: [],
          lastBlock,
          run: run.run + 1,
        });
        return;
      }

      show({ ...run, state: next, trace, linesGenerated });
    },
    [clock, newSeed, show, store],
  );

  const running = current !== null && !current.round.finished && current.state.startedAt !== null;
  useRunning(onRunning, running);

  useEffect(() => {
    box.current?.focus();
  }, [current?.run]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const t = clock.now();
      setNow(t);
      const cur = latest.current as ActiveRun;
      apply(tick(cur.state, t));
    }, TICK_MS);
    return () => {
      clearInterval(id);
    };
  }, [apply, clock, running]);

  useLayoutEffect(() => {
    const word = area.current?.querySelector<HTMLElement>(".word-current");
    if (area.current && word) {
      area.current.scrollTop = Math.max(0, word.offsetTop - word.offsetHeight);
    }
  });

  if (current === null) {
    return (
      <div className="screen weak-typing">
        <PanelTitle title="Pontos fracos">
          Blocos de 30 s focados nos pares mais lentos e teclas com mais erro.
        </PanelTitle>
        <div className="weak-empty" data-panel="options" data-testid="weak-empty">
          <p>
            Ainda não há dados suficientes nos últimos 14 dias para escolher seus pontos fracos.
            Faça algumas rodadas em Texto ou Código para registrar seus intervalos por par de
            caracteres.
          </p>
          <div className="actions">
            <button type="button" className="primary" onClick={onOpenText}>
              Ir para Texto
            </button>
            <button type="button" onClick={onBack}>
              Voltar
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { round, state, lastBlock } = current;
  const finished = round.finished;
  const active = currentWeakTarget(round);
  const focusedNgram = active !== null ? active.ngram : (lastBlock as WeakBlockSummary).ngram;
  const blockNumber = Math.min(round.blocks.length + 1, round.maxBlocks);
  const view = wordView(state);
  const typedInCurrent = [...(state.inputs[state.current] ?? "")].length;
  const ghost =
    pace.enabled && state.startedAt !== null && !finished
      ? ghostTextPosition(state.words, Math.max(0, now - state.startedAt), round.targetWpm)
      : null;
  const remainingS = Math.ceil(
    state.startedAt === null
      ? WEAK_BLOCK_SECONDS
      : Math.max(0, state.startedAt + WEAK_BLOCK_MS - Math.max(now, state.startedAt)) / 1000,
  );

  const resetBlock = (freshSeed: boolean) => {
    const run = latest.current as ActiveRun;
    const curTarget = currentWeakTarget(run.round) as WeakTarget;
    const seed = freshSeed ? newSeed() : run.blockSeed;
    show({
      ...run,
      blockSeed: seed,
      linesGenerated: INITIAL_LINES,
      state: makeBlockState(curTarget.ngram, seed),
      trace: [],
      run: run.run + 1,
    });
  };

  const restartRound = () => {
    const nextRun = initRun(store, paceRef.current, clock.wallTime(), newSeed, current.run + 1);
    show(nextRun);
  };

  const exit = () => {
    resetBlock(false);
    box.current?.blur();
  };

  const typed = (text: string) => {
    for (const ch of text.replace(/[\r\n]/g, "").normalize("NFC")) {
      const cur = latest.current as ActiveRun;
      apply(typeWordsText(cur.state, ch, clock.now()));
    }
  };

  const summary = finished ? summarizeWeakRound(round) : [];
  const targetMs = Math.round(targetIntervalMs(round.targetWpm));

  return (
    <div className="screen weak-typing">
      <PanelTitle title="Pontos fracos">
        Blocos de 30 s focados nos pares mais lentos e teclas com mais erro.
      </PanelTitle>

      <div className="weak-options" data-panel="options" role="group" aria-label="Opções">
        <div className="weak-queue" data-testid="weak-queue" aria-label="Fila de pontos fracos">
          {round.graduated.map((ng) => (
            <span key={`g-${ng}`} className="weak-chip weak-chip-graduated">
              <code>{ng}</code>
            </span>
          ))}
          {round.queue.map((t, idx) => (
            <span
              key={`q-${t.ngram}`}
              className={`weak-chip${idx === 0 && !finished ? " weak-chip-active" : ""}`}
            >
              <code>{t.ngram}</code>
              {t.beforeMedianMs !== null && (
                <span className="muted">{` ${formatMs(t.beforeMedianMs)}`}</span>
              )}
            </span>
          ))}
        </div>
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
      </div>

      <div className="text-area" data-panel="area">
        <RoundBar
          metrics={[
            {
              label: "bloco",
              value: `${String(blockNumber)}/${String(round.maxBlocks)}`,
              testId: "weak-block",
            },
            {
              label: "foco",
              value: <code>{focusedNgram}</code>,
              testId: "weak-focus",
              tone: "accent",
            },
            {
              label: "tempo",
              value: `${String(remainingS)} s`,
              testId: "weak-time",
              tone: "accent",
            },
            ...(pace.enabled
              ? [
                  {
                    label: "alvo",
                    value: `${String(round.targetWpm)} WPM`,
                    testId: "weak-target",
                  },
                ]
              : []),
          ]}
        />

        {lastBlock !== null && !finished && (
          <p className="weak-block-status" data-testid="weak-block-status">
            {lastBlock.graduated
              ? `“${lastBlock.ngram}” formado (${formatMs(lastBlock.afterMedianMs)}, ${String(Math.round(lastBlock.accuracy * 100))}%) — próximo: “${focusedNgram}”`
              : `“${lastBlock.ngram}”: ${formatMs(lastBlock.afterMedianMs)}, ${String(Math.round(lastBlock.accuracy * 100))}% — continua no próximo bloco`}
          </p>
        )}

        {!finished && (
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
                if (action === "skip") {
                  e.preventDefault();
                  resetBlock(true);
                  return;
                }
                if (action === "restart") {
                  e.preventDefault();
                  restartRound();
                  return;
                }
                switch (e.key) {
                  case "Backspace":
                    e.preventDefault();
                    apply(
                      e.ctrlKey || e.altKey || e.metaKey ? clearWord(state) : backspaceWord(state),
                    );
                    break;
                  case "Tab":
                  case "Enter":
                    e.preventDefault();
                    break;
                }
              }}
            />
            <div
              ref={area}
              className="text-words"
              data-testid="weak-words"
              onClick={() => {
                box.current?.focus();
              }}
            >
              {view.map((word, i) => (
                <WeakWord
                  key={i}
                  index={i}
                  status={word.status}
                  chars={word.letters.map((l) => l.char).join("")}
                  marks={word.letters.map((l) => MARK_CODES[l.mark]).join("")}
                  needle={focusedNgram}
                  cursor={i === state.current ? typedInCurrent : -1}
                  ghost={ghost !== null && ghost.word === i ? ghost.letter : -1}
                />
              ))}
            </div>
          </div>
        )}

        {finished && (
          <Result
            headline={
              <>
                <strong data-testid="weak-graduated-count">{round.graduated.length}</strong> de{" "}
                {summary.length} {summary.length === 1 ? "formado" : "formados"}
              </>
            }
            pairs={[
              { label: "blocos", value: round.blocks.length },
              {
                label: "alvo",
                value: `${String(round.targetWpm)} WPM · ${String(targetMs)} ms`,
              },
            ]}
            extra={
              <table className="weak-results-table" data-testid="weak-results-table">
                <thead>
                  <tr>
                    <th>N-grama</th>
                    <th>Antes</th>
                    <th>Depois</th>
                    <th>Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.map((row) => (
                    <tr key={row.ngram}>
                      <td>
                        <code>{row.ngram}</code>
                      </td>
                      <td>{formatMs(row.beforeMedianMs)}</td>
                      <td>{formatMs(row.afterMedianMs)}</td>
                      <td>{row.graduated ? "Formado" : "Em treino"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            }
            seed={
              <>
                seed <span data-testid="weak-seed">{current.roundSeed}</span>
              </>
            }
            onPlayAgain={restartRound}
          />
        )}
      </div>

      <div className="actions">
        <button type="button" onClick={onBack}>
          Voltar
        </button>
      </div>
    </div>
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

const WeakWord = memo(function WeakWord({
  index,
  status,
  chars,
  marks,
  needle,
  cursor,
  ghost,
}: {
  readonly index: number;
  readonly status: WordStatus;
  readonly chars: string;
  readonly marks: string;
  readonly needle: string;
  readonly cursor: number;
  readonly ghost: number;
}): ReactNode {
  const letters = [...chars];
  const highlighted = highlightMask(letters, [...needle]);
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
        const isWeak = highlighted[k] === true;
        return (
          <span
            key={k}
            data-mark={mark}
            data-ghost={isGhost ? "true" : undefined}
            data-weak-match={isWeak ? "true" : undefined}
            className={`letter-${mark}${isWeak ? " weak-highlight" : ""}${isGhost ? " ghost-cursor" : ""}${k === cursor ? " cursor" : ""}`}
          >
            {ch}
          </span>
        );
      })}
    </span>
  );
});
