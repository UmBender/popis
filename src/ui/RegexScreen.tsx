import type { ReactNode } from "react";
import type { Clock } from "../core/clock";
import type { KeyValueStore } from "../storage/history";

export type RegexDrill = "learn" | "practice";

export type RegexScreenProps = {
  readonly drill: RegexDrill;
  readonly clock: Clock;
  readonly store: KeyValueStore;
  readonly newSeed: () => number;
  readonly onBack: () => void;
  readonly onRunning?: (running: boolean) => void;
  readonly onLearn?: (lessonId?: string) => void;
  readonly onPractice?: () => void;
  readonly initialLesson?: string | null;
};

export function RegexScreen(_props: RegexScreenProps): ReactNode {
  throw new Error("todo");
}
