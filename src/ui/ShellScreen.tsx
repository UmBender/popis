import type { ReactNode } from "react";
import type { Clock } from "../core/clock";
import type { KeyValueStore } from "../storage/history";

export type ShellDrill = "learn" | "commands";

export type ShellScreenProps = {
  readonly drill: ShellDrill;
  readonly clock: Clock;
  readonly store: KeyValueStore;
  readonly newSeed: () => number;
  readonly onBack: () => void;
  readonly onRunning?: (running: boolean) => void;
  readonly onLearn?: (lessonId?: string) => void;
  readonly onPractice?: () => void;
  readonly initialLesson?: string | null;
};

export function ShellScreen(_props: ShellScreenProps): ReactNode {
  throw new Error("todo");
}
