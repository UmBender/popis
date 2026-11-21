import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { Clock } from "../core/clock";
import { MODES, type Mode } from "../modes";
import {
  remainingMs,
  skipProblem,
  tick,
  typeAnswer,
  type FinishedSession,
  type RunningSession,
  type SessionState,
} from "../session/engine";
import { answerText } from "./format";
import { verdicts, type Verdict } from "./verdicts";

/** The judge's verdicts, newest last with a fading outline (docs/architecture/Shell.md). */
function Queue({ marks }: { readonly marks: readonly Verdict[] }): ReactNode {
  return (
    <ol className="verdicts" aria-label="Submissões">
      {marks.map((mark, i) => (
        <li
          // The newest mark is remounted each time, so its outline animates again.
          key={i === marks.length - 1 ? `now-${String(i)}` : i}
          className={`verdict ${mark.toLowerCase()}${i === marks.length - 1 ? " now" : ""}`}
        >
          {mark}
        </li>
      ))}
    </ol>
  );
}

/** How often the timer is redrawn and the end of the session checked. */
const TICK_MS = 100;
/** The timer turns to the warning colour for the last seconds. */
const WARNING_S = 10;

type Props<P> = {
  readonly initial: RunningSession<P>;
  readonly clock: Clock;
  /** Decides the keyboard, the answer width and whether Enter skips (src/modes.ts). */
  readonly mode: Mode;
  readonly onFinish: (session: FinishedSession<P>) => void;
  readonly onAbort: () => void;
};

export function GameScreen<P>({ initial, clock, mode, onFinish, onAbort }: Props<P>): ReactNode {
  const [session, setSession] = useState<RunningSession<P>>(initial);
  const [now, setNow] = useState(() => clock.now());
  // The latest state, read by the interval and event handlers. It changes only
  // in `apply`, outside render, so a finished session is reported exactly once.
  const latest = useRef<SessionState<P>>(initial);

  const apply = useCallback(
    (next: SessionState<P>) => {
      if (next === latest.current) return;
      latest.current = next;
      if (next.status === "finished") onFinish(next);
      else setSession(next);
    },
    [onFinish],
  );

  useEffect(() => {
    const id = setInterval(() => {
      const t = clock.now();
      setNow(t);
      apply(tick(latest.current, t));
    }, TICK_MS);
    return () => {
      clearInterval(id);
    };
  }, [apply, clock]);

  const secondsLeft = Math.ceil(remainingMs(session, now) / 1000);
  const spec = MODES[mode];
  const last = session.log.at(-1);
  const { choices } = session.problem;

  return (
    <div className="screen game">
      <div className="status">
        <span
          data-testid="timer"
          aria-label="Tempo"
          className={secondsLeft <= WARNING_S ? "timer warning" : "timer"}
        >
          {secondsLeft}
        </span>
        <span>
          acertos{" "}
          <span data-testid="score" className="score">
            {session.score}
          </span>
        </span>
      </div>
      <div className="problem">
        <span
          data-testid="prompt"
          className={session.problem.prompt.includes("\n") ? "prompt code" : "prompt"}
        >
          {session.problem.prompt}
        </span>
        {choices === undefined && <span className="equals">=</span>}
        <input
          className={spec.wide ? "answer wide" : "answer"}
          aria-label="Resposta"
          autoFocus
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          inputMode={spec.numeric ? "numeric" : "text"}
          value={session.input}
          onChange={(e) => {
            apply(typeAnswer(latest.current, e.target.value, clock.now()));
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") onAbort();
            if (e.key === "Enter" && spec.allowSkip) {
              e.preventDefault();
              apply(skipProblem(latest.current, clock.now()));
            }
          }}
        />
      </div>
      {choices !== undefined && (
        <ol className="choices" aria-label="Opções">
          {choices.map((choice, i) => (
            <li key={choice}>{`${i + 1}) ${choice}`}</li>
          ))}
        </ol>
      )}
      <Queue marks={verdicts(session.log, session.corrections)} />
      {last?.outcome === "skipped" && (
        <p data-testid="skipped" className="skipped">
          Pulada: {last.problem.prompt} = {answerText(last.problem)}
        </p>
      )}
    </div>
  );
}
