import type { ReactNode } from "react";
import type { Clock } from "../core/clock";
import type { KeyValueStore } from "../storage/history";

export type IcpcScreenProps = {
  readonly clock: Clock;
  readonly store: KeyValueStore;
  readonly newSeed: () => number;
  readonly onBack: () => void;
  readonly onRunning?: (running: boolean) => void;
};

export function IcpcScreen(_props: IcpcScreenProps): ReactNode {
  throw new Error("todo");
}
