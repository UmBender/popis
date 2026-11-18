import { useCallback, useState, type ReactNode } from "react";
import type { Clock } from "../core/clock";
import { arithmetic, type ArithmeticSettings } from "../gen/arithmetic";
import {
  startSession,
  type Attempt,
  type FinishedSession,
  type RunningSession,
} from "../session/engine";
import {
  appendSession,
  loadSettings,
  saveSettings,
  type KeyValueStore,
  type StoredSettings,
} from "../storage/history";
import { ConfigScreen } from "./ConfigScreen";
import { GameScreen } from "./GameScreen";
import { ResultsScreen } from "./ResultsScreen";

export type AppProps = {
  readonly clock: Clock;
  readonly store: KeyValueStore;
  /** Seed of each new session. */
  readonly newSeed: () => number;
};

type Screen =
  | { readonly name: "config" }
  | { readonly name: "game"; readonly session: RunningSession<ArithmeticSettings> }
  | { readonly name: "results"; readonly log: readonly Attempt[] };

export function App({ clock, store, newSeed }: AppProps): ReactNode {
  const [settings, setSettings] = useState<StoredSettings>(() => loadSettings(store));
  const [screen, setScreen] = useState<Screen>({ name: "config" });

  const start = () => {
    saveSettings(store, settings);
    const session = startSession(
      {
        generator: arithmetic,
        params: settings.arithmetic,
        durationMs: settings.durationS * 1000,
        seed: newSeed(),
      },
      clock.now(),
    );
    setScreen({ name: "game", session });
  };

  const finish = useCallback(
    (session: FinishedSession<ArithmeticSettings>) => {
      appendSession(store, {
        version: 1,
        mode: "arithmetic",
        finishedAt: clock.wallTime(),
        durationMs: session.config.durationMs,
        seed: session.config.seed,
        params: session.config.params,
        log: session.log,
      });
      setScreen({ name: "results", log: session.log });
    },
    [clock, store],
  );

  const abort = useCallback(() => {
    setScreen({ name: "config" });
  }, []);

  switch (screen.name) {
    case "config":
      return <ConfigScreen settings={settings} onChange={setSettings} onStart={start} />;
    case "game":
      return (
        <GameScreen
          // A new session remounts the screen, resetting its state.
          key={screen.session.config.seed}
          initial={screen.session}
          clock={clock}
          onFinish={finish}
          onAbort={abort}
        />
      );
    case "results":
      return (
        <ResultsScreen
          log={screen.log}
          onPlayAgain={start}
          onConfigure={() => {
            setScreen({ name: "config" });
          }}
        />
      );
  }
}
