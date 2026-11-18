import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { Clock } from "../core/clock";
import {
  remainingMs,
  tick,
  typeAnswer,
  type FinishedSession,
  type RunningSession,
  type SessionState,
} from "../session/engine";

/** How often the timer is redrawn and the end of the session checked. */
const TICK_MS = 100;
/** The timer turns to the warning colour for the last seconds. */
const WARNING_S = 10;

type Props<P> = {
  readonly initial: RunningSession<P>;
  readonly clock: Clock;
  readonly onFinish: (session: FinishedSession<P>) => void;
  readonly onAbort: () => void;
};

export function GameScreen<P>({ initial, clock, onFinish, onAbort }: Props<P>): ReactNode {
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

  return (
    <div className="screen game">
      <div className="status">
        <span>
          Tempo:{" "}
          <span
            data-testid="timer"
            className={secondsLeft <= WARNING_S ? "timer warning" : "timer"}
          >
            {secondsLeft}
          </span>
        </span>
        <span>
          Pontos: <span data-testid="score">{session.score}</span>
        </span>
      </div>
      <div className="problem">
        <span data-testid="prompt" className="prompt">
          {session.problem.prompt}
        </span>
        <span className="equals">=</span>
        <input
          className="answer"
          aria-label="Resposta"
          autoFocus
          autoComplete="off"
          inputMode="numeric"
          value={session.input}
          onChange={(e) => {
            apply(typeAnswer(latest.current, e.target.value, clock.now()));
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") onAbort();
          }}
        />
      </div>
      <p className="muted hint">Esc volta para a configuração.</p>
    </div>
  );
}
