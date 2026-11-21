import type { ReactNode } from "react";
import type { Clock } from "../../core/clock";
import type { KeyValueStore } from "../../storage/kv";

export type ProgressScreenProps = {
  readonly store: KeyValueStore;
  readonly clock: Clock;
  readonly focusItem?: string | null;
};

export function ProgressScreen(_props: ProgressScreenProps): ReactNode {
  throw new Error("todo");
}
