import type { ReactNode } from "react";
import type { Clock } from "../core/clock";
import type { KeyValueStore } from "../storage/history";

export type StlScreenProps = {
  readonly clock: Clock;
  readonly store: KeyValueStore;
  readonly newSeed: () => number;
  readonly onBack: () => void;
  readonly onRunning?: (running: boolean) => void;
};

/** C++ and STL output prediction drill (T42 AC-5, ADR-T42-1). */
export function StlScreen(_props: StlScreenProps): ReactNode {
  throw new Error("todo");
}
