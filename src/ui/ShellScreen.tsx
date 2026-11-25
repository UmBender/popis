import type { ReactNode } from "react";
import type { Clock } from "../core/clock";
import type { KeyValueStore } from "../storage/history";
import { CommandDrill } from "./shell-drill/CommandDrill";
import { LearnDrill } from "./shell-drill/LearnDrill";

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

/** The Shell screen: Aprender curriculum or Comandos timed drill (ADR-T39-1). */
export function ShellScreen(props: ShellScreenProps): ReactNode {
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
    <CommandDrill
      clock={props.clock}
      store={props.store}
      newSeed={props.newSeed}
      onBack={props.onBack}
      onRunning={props.onRunning}
      onLearn={props.onLearn}
    />
  );
}
