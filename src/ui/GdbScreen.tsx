import type { ReactNode } from "react";
import type { Clock } from "../core/clock";
import type { KeyValueStore } from "../storage/history";
import { CommandDrill } from "./gdb/CommandDrill";
import { LearnDrill } from "./gdb/LearnDrill";

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

/** The GDB screen: ordered curriculum (Aprender) or timed command drill (Comandos) (ADR-T25-1). */
export function GdbScreen(props: GdbScreenProps): ReactNode {
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
