import { useCallback, useState, type ReactNode } from "react";
import type { Clock } from "../core/clock";
import type { Generator, JsonValue } from "../core/problem";
import { isMode, MODES, type Mode } from "../modes";
import {
  startSession,
  type Attempt,
  type FinishedSession,
  type RunningSession,
  type SessionConfig,
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
  | { readonly name: "game"; readonly mode: Mode; readonly session: RunningSession<JsonValue> }
  | { readonly name: "results"; readonly mode: Mode; readonly log: readonly Attempt[] };

function sessionConfig<M extends Mode>(
  mode: M,
  settings: StoredSettings,
  seed: number,
): SessionConfig<JsonValue> {
  return {
    // Every mode's settings are plain JSON (ModeSettings), so this widening is safe.
    generator: MODES[mode].generator as Generator<JsonValue>,
    params: settings[mode] as JsonValue,
    durationMs: settings.durationS * 1000,
    seed,
  };
}

/** Generator ids are the mode ids (src/modes.test.ts). */
function modeOf(session: FinishedSession<JsonValue>): Mode {
  const id = session.config.generator.id;
  return isMode(id) ? id : "arithmetic";
}

export function App({ clock, store, newSeed }: AppProps): ReactNode {
  const [settings, setSettings] = useState<StoredSettings>(() => loadSettings(store));
  const [screen, setScreen] = useState<Screen>({ name: "config" });

  const start = () => {
    saveSettings(store, settings);
    const session = startSession(sessionConfig(settings.mode, settings, newSeed()), clock.now());
    setScreen({ name: "game", mode: settings.mode, session });
  };

  const finish = useCallback(
    (session: FinishedSession<JsonValue>) => {
      const mode = modeOf(session);
      appendSession(store, {
        version: 1,
        mode,
        finishedAt: clock.wallTime(),
        durationMs: session.config.durationMs,
        seed: session.config.seed,
        params: session.config.params,
        log: session.log,
      });
      setScreen({ name: "results", mode, log: session.log });
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
          initial={screen.session}
          clock={clock}
          mode={screen.mode}
          onFinish={finish}
          onAbort={abort}
        />
      );
    case "results":
      return (
        <ResultsScreen
          log={screen.log}
          mode={screen.mode}
          onPlayAgain={start}
          onConfigure={() => {
            setScreen({ name: "config" });
          }}
        />
      );
  }
}
