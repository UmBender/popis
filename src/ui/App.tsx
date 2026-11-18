import { useCallback, useMemo, useState, type ReactNode } from "react";
import type { Clock } from "../core/clock";
import type { JsonValue } from "../core/problem";
import { MODES, type Mode } from "../modes";
import {
  startSession,
  type Attempt,
  type FinishedSession,
  type RunningSession,
  type SessionConfig,
} from "../session/engine";
import {
  appendSession,
  loadHistory,
  loadSettings,
  saveSettings,
  type KeyValueStore,
  type StoredSettings,
} from "../storage/history";
import { reviewItems } from "../storage/review";
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
  params: JsonValue,
  settings: StoredSettings,
  seed: number,
): SessionConfig<JsonValue> {
  return {
    generator: MODES[mode].generator,
    params,
    durationMs: settings.durationS * 1000,
    seed,
  };
}

export function App({ clock, store, newSeed }: AppProps): ReactNode {
  const [settings, setSettings] = useState<StoredSettings>(() => loadSettings(store));
  const [screen, setScreen] = useState<Screen>({ name: "config" });
  // Read again each time the config shows, so the last session counts.
  const reviewCount = useMemo(
    () => (screen.name === "config" ? reviewItems(loadHistory(store)).length : 0),
    [screen.name, store],
  );

  const start = () => {
    saveSettings(store, settings);
    let params: JsonValue = settings[settings.mode];
    if (settings.mode === "review") {
      // Review items come from history at start, never from the settings.
      const items = reviewItems(loadHistory(store));
      if (items.length === 0) {
        setScreen({ name: "config" });
        return;
      }
      params = { items };
    }
    const session = startSession(
      sessionConfig(settings.mode, params, settings, newSeed()),
      clock.now(),
    );
    setScreen({ name: "game", mode: settings.mode, session });
  };

  // Stable for the whole game, so the game screen's timer is not reset.
  const gameMode = screen.name === "game" ? screen.mode : settings.mode;
  const finish = useCallback(
    (session: FinishedSession<JsonValue>) => {
      const mode = gameMode;
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
    [clock, store, gameMode],
  );

  const abort = useCallback(() => {
    setScreen({ name: "config" });
  }, []);

  switch (screen.name) {
    case "config":
      return (
        <ConfigScreen
          settings={settings}
          reviewCount={reviewCount}
          onChange={setSettings}
          onStart={start}
        />
      );
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
