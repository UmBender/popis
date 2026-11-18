/** Time source, injected so tests can control it. */
export interface Clock {
  /** Monotonic milliseconds, for durations. */
  now(): number;
  /** Milliseconds since the Unix epoch, for timestamps. */
  wallTime(): number;
}

/** A clock that only moves when told to. */
export interface ManualClock extends Clock {
  advance(ms: number): void;
}

export const systemClock: Clock = {
  now: () => performance.now(),
  wallTime: () => Date.now(),
};

export function manualClock(start = 0): ManualClock {
  let t = start;
  return {
    now: () => t,
    wallTime: () => t,
    advance(ms) {
      t += ms;
    },
  };
}
