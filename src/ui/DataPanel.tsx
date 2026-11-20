import type { ReactNode } from "react";
import type { Clock } from "../core/clock";
import type { KeyValueStore } from "../storage/history";

export type DataPanelProps = {
  readonly store: KeyValueStore;
  readonly clock: Clock;
  /** Hands a file to the player; the browser's download by default. */
  readonly save?: (name: string, text: string) => void;
};

/** Export and import of everything the app stores. */
export function DataPanel(_props: DataPanelProps): ReactNode {
  throw new Error("todo");
}
