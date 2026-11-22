import type { ReactNode } from "react";
import type { Clock } from "../core/clock";
import type { KeyValueStore } from "../storage/history";
import { CommandDrill } from "./gdb/CommandDrill";
import { LearnDrill } from "./gdb/LearnDrill";
import { OutputDrill } from "./gdb/OutputDrill";

export type GdbDrill = "learn" | "commands" | "output";

export type GdbScreenProps = {
  readonly drill: GdbDrill;
  readonly clock: Clock;
  readonly store: KeyValueStore;
  readonly newSeed: () => number;
  readonly onBack: () => void;
  readonly onRunning?: (running: boolean) => void;
  readonly onLearn?: (lessonId?: string) => void;
  readonly onPractice?: () => void;
  readonly onPracticeOutput?: () => void;
  readonly initialLesson?: string | null;
};

/** The GDB screen: Aprender curriculum, Comandos drill, or Saída drill (ADR-T25-1, ADR-T26-1). */
export function GdbScreen(props: GdbScreenProps): ReactNode {
  if (props.drill === "learn") {
    return (
      <LearnDrill
        store={props.store}
        onBack={props.onBack}
        onPractice={props.onPractice}
        onPracticeOutput={props.onPracticeOutput}
        initialLesson={props.initialLesson}
      />
    );
  }
  if (props.drill === "output") {
    return (
      <OutputDrill
        clock={props.clock}
        store={props.store}
        newSeed={props.newSeed}
        onBack={props.onBack}
        onRunning={props.onRunning}
        onLearn={props.onLearn}
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
