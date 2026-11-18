import type { ReactNode } from "react";
import type { Clock } from "../core/clock";
import type { KeyValueStore } from "../storage/history";

export type AppProps = {
  readonly clock: Clock;
  readonly store: KeyValueStore;
  /** Seed of each new session. */
  readonly newSeed: () => number;
};

export function App(_props: AppProps): ReactNode {
  throw new Error("todo");
}
