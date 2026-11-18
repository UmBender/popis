import type { ReactNode } from "react";
import type { Clock } from "../core/clock";
import type { KeyValueStore } from "../storage/history";

type Props = {
  readonly clock: Clock;
  readonly store: KeyValueStore;
  /** Seed of each new snippet. */
  readonly newSeed: () => number;
  readonly onBack: () => void;
};

export function TypingScreen(props: Props): ReactNode {
  void props;
  throw new Error("todo");
}
