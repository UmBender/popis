import type { ReactNode } from "react";
import type { Clock } from "../core/clock";
import type { KeyValueStore } from "../storage/history";

export type WeakTypingScreenProps = {
  readonly clock: Clock;
  readonly store: KeyValueStore;
  readonly newSeed: () => number;
  readonly onBack: () => void;
  readonly onRunning?: (running: boolean) => void;
  readonly onOpenText: () => void;
};

export function WeakTypingScreen(_props: WeakTypingScreenProps): ReactNode {
  throw new Error("todo");
}
