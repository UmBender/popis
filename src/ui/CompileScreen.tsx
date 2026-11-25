import type { ReactNode } from "react";
import type { Clock } from "../core/clock";
import type { KeyValueStore } from "../storage/history";

export type CompileScreenProps = {
  readonly clock: Clock;
  readonly store: KeyValueStore;
  readonly newSeed: () => number;
  readonly onBack: () => void;
  readonly onRunning?: (running: boolean) => void;
};

/** Compiler & sanitizer output reading drill (T40 AC-4, ADR-T40-1). */
export function CompileScreen(_props: CompileScreenProps): ReactNode {
  throw new Error("todo");
}
