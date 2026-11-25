import type { ReactNode } from "react";
import type { Clock } from "../core/clock";
import type { KeyValueStore } from "../storage/history";
import { LearnDrill } from "./regex/LearnDrill";
import { PracticeDrill } from "./regex/PracticeDrill";

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

/** The Regex screen: Aprender 9-unit curriculum or Prática live drill (ADR-T45-1). */
export function RegexScreen(props: RegexScreenProps): ReactNode {
  if (props.drill === "learn") {
    return (
      <LearnDrill
        store={props.store}
        onBack={props.onBack}
        onPractice={props.onPractice}
        initialLesson={props.initialLesson}
      />
    );
  }
  return (
    <PracticeDrill
      clock={props.clock}
      store={props.store}
      newSeed={props.newSeed}
      onBack={props.onBack}
      onRunning={props.onRunning}
      onLearn={props.onLearn}
    />
  );
}
