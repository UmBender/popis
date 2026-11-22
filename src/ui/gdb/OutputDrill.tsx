import type { ReactNode } from "react";
import type { Clock } from "../../core/clock";
import type { KeyValueStore } from "../../storage/history";

export type OutputDrillProps = {
  readonly clock: Clock;
  readonly store: KeyValueStore;
  readonly newSeed: () => number;
  readonly onBack: () => void;
  readonly onRunning?: (running: boolean) => void;
  readonly onLearn?: (lessonId?: string) => void;
};

/** GDB Saída timed drill (T26 AC-7). */
export function OutputDrill(_props: OutputDrillProps): ReactNode {
  throw new Error("todo");
}
