import type { ReactNode } from "react";
import type { Clock } from "../core/clock";
import type { KeyValueStore } from "../storage/history";

type Props = {
  readonly clock: Clock;
  readonly store: KeyValueStore;
  /** Seed of each new text. */
  readonly newSeed: () => number;
  readonly onBack: () => void;
};

/** Text typing test, judged word by word (ADR-T12-1). */
export function TextTypingScreen(props: Props): ReactNode {
  void props;
  throw new Error("todo");
}
