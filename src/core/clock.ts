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
  now: () => {
    throw new Error("todo");
  },
  wallTime: () => {
    throw new Error("todo");
  },
};

export function manualClock(_start = 0): ManualClock {
  throw new Error("todo");
}
