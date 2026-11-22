import type { ReactNode } from "react";
import type { Clock } from "../core/clock";
import type { KeyValueStore } from "../storage/history";

export type GdbDrill = "learn" | "commands";

export type GdbScreenProps = {
  readonly drill: GdbDrill;
  readonly clock: Clock;
  readonly store: KeyValueStore;
  readonly newSeed: () => number;
  readonly onBack: () => void;
  readonly onRunning?: (running: boolean) => void;
  readonly onLearn?: (lessonId?: string) => void;
  readonly onPractice?: () => void;
  readonly initialLesson?: string | null;
};

export function GdbScreen(_props: GdbScreenProps): ReactNode {
  throw new Error("todo");
}
