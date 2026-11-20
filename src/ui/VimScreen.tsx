import type { ReactNode } from "react";
import type { Clock } from "../core/clock";
import type { KeyValueStore } from "../storage/history";

type Props = {
  readonly clock: Clock;
  readonly store: KeyValueStore;
  /** Seed of each new round. */
  readonly newSeed: () => number;
  readonly onBack: () => void;
};

/** The Vim motion drill (ADR-T13-1). */
export function VimScreen(_props: Props): ReactNode {
  throw new Error("todo");
}
