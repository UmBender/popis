import type { ReactNode } from "react";
import type { Clock } from "../core/clock";
import type { KeyValueStore } from "../storage/history";

export type ContestsScreenProps = {
  readonly clock: Clock;
  readonly store: KeyValueStore;
  readonly fetchData?: typeof fetch;
  readonly save?: (name: string, text: string) => void;
  readonly timeZone?: string;
};

export function ContestsScreen(_props: ContestsScreenProps): ReactNode {
  throw new Error("todo");
}
