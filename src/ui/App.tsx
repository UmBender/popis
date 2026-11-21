import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
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
  type SessionRecord,
  type StoredSettings,
} from "../storage/history";
import { migrate } from "../storage/migrate";
import { reviewItems } from "../storage/review";
import type { VimDrill } from "../storage/vim";
import { Brand } from "./Brand";
import { ConfigScreen, configErrors } from "./ConfigScreen";
import { DataPanel } from "./DataPanel";
import { GameScreen } from "./GameScreen";
import { MENU_HINTS, RESULT_HINTS, ROUND_HINTS, VIM_ROUND_HINTS, type Hint } from "./keys";
import { ResultsScreen } from "./ResultsScreen";
import { PanelTitle, ReferencesContext, type References } from "./shell/panel";
import { loadPrefs, savePrefs, type ShellPrefs } from "./shell/prefs";
import { folderOf, itemById, modeOf, type ItemId } from "./shell/sections";
import { isControl, Shell, type TreeState } from "./shell/Shell";
import { TextTypingScreen } from "./TextTypingScreen";
import { TypingScreen } from "./TypingScreen";
import { chooseVimDrill, VimScreen } from "./VimScreen";

export type AppProps = {
  readonly clock: Clock;
  readonly store: KeyValueStore;
  /** Seed of each new session. */
  readonly newSeed: () => number;
  /** Below 48rem the tree is a drawer; measured with matchMedia when absent. */
  readonly narrow?: boolean;
};

type Screen =
  | { readonly name: "menu" }
  | {
      readonly name: "game";
      readonly mode: Mode;
      readonly session: RunningSession<JsonValue>;
      readonly run: number;
    }
  | {
      readonly name: "results";
      readonly mode: Mode;
      readonly log: readonly Attempt[];
      readonly seed: number;
      readonly durationMs: number;
      readonly best: number;
    };

const VIM_DRILLS: Partial<Readonly<Record<ItemId, VimDrill>>> = {
  "vim-learn": "learn",
  "vim-motion": "motion",
  "vim-edit": "edit",
};

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

/** Deep equality of JSON values, whatever the key order. */
function sameJson(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  return (
    ka.length === kb.length &&
    ka.every((k) => sameJson((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]))
  );
}

/** Scores of the rounds played in this configuration, oldest first. */
function scoresOf(
  history: readonly SessionRecord[],
  mode: Mode,
  params: JsonValue,
  durationMs: number,
): number[] {
  return history
    .filter(
      (r) =>
        r.mode === mode &&
        // Review items change every round, so only the mode counts.
        (mode === "review" || (r.durationMs === durationMs && sameJson(r.params, params))),
    )
    .map((r) => r.log.filter((a) => a.outcome === "correct").length);
}

/** Whether a media query matches, followed as the window changes. */
function useMedia(query: string, override?: boolean): boolean {
  const supported = typeof window.matchMedia === "function";
  const [matches, setMatches] = useState(() => supported && window.matchMedia(query).matches);
  useEffect(() => {
    if (override !== undefined || !supported) return;
    const list = window.matchMedia(query);
    const update = () => {
      setMatches(list.matches);
    };
    list.addEventListener("change", update);
    return () => {
      list.removeEventListener("change", update);
    };
  }, [query, override, supported]);
  return override ?? matches;
}

function firstItem(prefs: ShellPrefs, mode: Mode): ItemId {
  // A mode item defers to the stored settings, which say which mode was last.
  return prefs.item !== null && modeOf(prefs.item) === null ? prefs.item : mode;
}

const lower = (text: string) => text.toLocaleLowerCase("pt-BR");

export function App({ clock, store, newSeed, narrow }: AppProps): ReactNode {
  const [settings, setSettings] = useState<StoredSettings>(() => loadSettings(store));
  const [prefs, setPrefs] = useState<ShellPrefs>(() => loadPrefs(store));
  const [item, setItem] = useState<ItemId>(() => firstItem(loadPrefs(store), settings.mode));
  const [screen, setScreen] = useState<Screen>({ name: "menu" });
  // A typing or Vim round is being played: the tree hides.
  const [running, setRunning] = useState(false);
  // Lesson to open when jumping to Aprender from a "Comandos" panel (T20 AC-5).
  const [learnLesson, setLearnLesson] = useState<string | null>(null);
  const isNarrow = useMedia("(max-width: 48rem)", narrow);
  const touch = useMedia("(hover: none) and (pointer: coarse)");

  // The old per-round results become events, once (T22).
  useEffect(() => {
    migrate(store, clock.wallTime());
  }, [store, clock]);

  const updatePrefs = useCallback(
    (patch: Partial<ShellPrefs>) => {
      setPrefs((prev) => {
        const next = { ...prev, ...patch };
        savePrefs(store, next);
        return next;
      });
    },
    [store],
  );

  // Read again each time the menu shows, so the last session counts.
  const history = useMemo(
    () => (screen.name === "menu" ? loadHistory(store) : []),
    [screen.name, store],
  );
  const reviewCount = useMemo(() => reviewItems(history).length, [history]);
  const scores = scoresOf(
    history,
    settings.mode,
    settings[settings.mode],
    settings.durationS * 1000,
  );

  const references = useMemo<References>(
    () => ({
      isOpen: (id) => prefs.open.includes(id),
      setOpen: (id, open) => {
        updatePrefs({ open: open ? [...prefs.open, id] : prefs.open.filter((x) => x !== id) });
      },
    }),
    [prefs.open, updatePrefs],
  );

  const choose = (id: ItemId) => {
    const mode = modeOf(id);
    if (mode !== null) setSettings((s) => ({ ...s, mode }));
    const drill = VIM_DRILLS[id];
    if (drill !== undefined) chooseVimDrill(store, drill);
    if (id !== "vim-learn") setLearnLesson(null);
    setItem(id);
    updatePrefs({ item: id });
    setRunning(false);
    setScreen({ name: "menu" });
  };

  const backToMode = () => {
    choose(settings.mode);
  };

  const start = () => {
    saveSettings(store, settings);
    let params: JsonValue = settings[settings.mode];
    if (settings.mode === "review") {
      // Review items come from history at start, never from the settings.
      const items = reviewItems(loadHistory(store));
      if (items.length === 0) {
        choose("review");
        return;
      }
      params = { items };
    }
    const session = startSession(
      sessionConfig(settings.mode, params, settings, newSeed()),
      clock.now(),
    );
    setItem(settings.mode);
    setScreen((prev) => ({
      name: "game",
      mode: settings.mode,
      session,
      run: prev.name === "game" ? prev.run + 1 : 1,
    }));
  };

  // Stable for the whole game, so the game screen's timer is not reset.
  const gameMode = screen.name === "game" ? screen.mode : settings.mode;
  const finish = useCallback(
    (session: FinishedSession<JsonValue>) => {
      const mode = gameMode;
      const { durationMs, seed, params } = session.config;
      appendSession(store, {
        version: 1,
        mode,
        finishedAt: clock.wallTime(),
        durationMs,
        seed,
        params,
        log: session.log,
      });
      const best = Math.max(0, ...scoresOf(loadHistory(store), mode, params, durationMs));
      setScreen({ name: "results", mode, log: session.log, seed, durationMs, best });
    },
    [clock, store, gameMode],
  );

  const abort = useCallback(() => {
    setScreen({ name: "menu" });
  }, []);

  const onResultKey = (e: KeyboardEvent) => {
    if (screen.name !== "results") return;
    if (e.key === "Escape") setScreen({ name: "menu" });
    else if (e.key === "r") choose("review");
    else if (e.key === "Enter" && !isControl(e.target)) start();
    else return;
    e.preventDefault();
  };

  const tree: TreeState | null =
    screen.name === "menu" && !running
      ? {
          item,
          closed: prefs.closed,
          reviewCount,
          touch,
          onChoose: choose,
          onFolder: (folder, open) => {
            const others = prefs.closed.filter((f) => f !== folder);
            updatePrefs({ closed: open ? others : [...others, folder] });
          },
          onStart: () => {
            if (modeOf(item) === null) {
              document
                .querySelector<HTMLElement>("[data-panel=area] textarea, [data-panel=area] input")
                ?.focus();
            } else if (configErrors(settings, reviewCount).length === 0) {
              start();
            }
          },
          onBack: () => {
            if (modeOf(item) === null) backToMode();
          },
        }
      : null;

  const shown = screen.name === "menu" ? item : screen.mode;
  const path = [lower(folderOf(shown).label), lower(itemById(shown).label)];

  let panel: ReactNode;
  let status: { mode: "NORMAL" | "JOGANDO" | "RESULTADO"; hints: readonly Hint[] };
  let right: ReactNode = "rodada em andamento";
  switch (screen.name) {
    case "game": {
      status = {
        mode: "JOGANDO",
        hints: ROUND_HINTS,
      };
      panel = (
        <GameScreen
          key={screen.run}
          initial={screen.session}
          clock={clock}
          mode={screen.mode}
          onFinish={finish}
          onAbort={abort}
          onRestart={start}
        />
      );
      break;
    }
    case "results":
      path.push("resultado");
      right = `${String(Math.round(screen.durationMs / 1000))} s`;
      status = { mode: "RESULTADO", hints: RESULT_HINTS };
      panel = (
        <ResultsScreen
          log={screen.log}
          mode={screen.mode}
          seed={screen.seed}
          durationMs={screen.durationMs}
          best={screen.best}
          onPlayAgain={start}
          onConfigure={abort}
        />
      );
      break;
    case "menu":
      status = running
        ? {
            mode: "JOGANDO",
            hints: VIM_DRILLS[item] !== undefined ? VIM_ROUND_HINTS : ROUND_HINTS,
          }
        : { mode: "NORMAL", hints: MENU_HINTS };
      if (!running) right = <Brand />;
      panel = menuPanel();
      break;
  }

  function menuPanel(): ReactNode {
    const drill = VIM_DRILLS[item];
    if (drill !== undefined) {
      return (
        <VimScreen
          key={item}
          clock={clock}
          store={store}
          newSeed={newSeed}
          onBack={backToMode}
          onRunning={setRunning}
          onLearn={(lessonId) => {
            setLearnLesson(lessonId ?? null);
            choose("vim-learn");
          }}
          onPractice={(targetDrill) => {
            choose(targetDrill === "motion" ? "vim-motion" : "vim-edit");
          }}
          initialLesson={learnLesson}
          readOnly={touch}
        />
      );
    }
    switch (item) {
      case "typing":
        return (
          <TypingScreen
            clock={clock}
            store={store}
            newSeed={newSeed}
            onBack={backToMode}
            onRunning={setRunning}
          />
        );
      case "text":
        return (
          <TextTypingScreen
            clock={clock}
            store={store}
            newSeed={newSeed}
            onBack={backToMode}
            onRunning={setRunning}
          />
        );
      case "data":
        return (
          <div className="screen data">
            <PanelTitle title="Dados">Exporte ou importe tudo o que o app guarda.</PanelTitle>
            <div data-panel="options">
              <DataPanel store={store} clock={clock} />
            </div>
          </div>
        );
      default:
        return (
          <ConfigScreen
            settings={settings}
            reviewCount={reviewCount}
            onChange={setSettings}
            onStart={start}
            history={scores}
          />
        );
    }
  }

  return (
    <ReferencesContext.Provider value={references}>
      <Shell
        path={path}
        right={right}
        mode={status.mode}
        hints={status.hints}
        tree={tree}
        narrow={isNarrow}
        collapsed={prefs.collapsed}
        onCollapsed={(collapsed) => {
          updatePrefs({ collapsed });
        }}
        onKey={onResultKey}
      >
        {panel}
      </Shell>
    </ReferencesContext.Provider>
  );
}
