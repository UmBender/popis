import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
import { sessionEvents } from "../stats/derive";
import {
  arithmeticForLevel,
  chooseNextLevel,
  defaultLevelRatings,
  drillLevelCount,
  estimationForLevel,
  INITIAL_ELO,
  levelOfArithmetic,
  levelOfEstimation,
  levelOfSums,
  replayElo,
  sumsForLevel,
  type AutoLevelDrill,
} from "../stats/elo";
import { kcStats } from "../stats/kc";
import { detectPlateau, weeklyRate, type RoundPoint } from "../stats/learning";
import { recommendForDrill } from "../stats/recommend";
import {
  loadAdaptiveSettings,
  saveAdaptiveSettings,
  type AdaptiveSettings,
} from "../storage/adaptive";
import { loadAllEvents } from "../storage/events";
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
import {
  dueReviewCards,
  recordSessionReview,
  reviewVimCardAttempt,
  syncReviewDeck,
  type CalcReviewCard,
  type VimReviewCard,
} from "../storage/review";
import { loadVimSettings, saveVimSettings, type VimDrill } from "../storage/vim";
import { skillLabel } from "./format";
import { Brand } from "./Brand";
import { ConfigScreen, configErrors } from "./ConfigScreen";
import { DailyScreen } from "./DailyScreen";
import { DataPanel } from "./DataPanel";
import { GameScreen } from "./GameScreen";
import { MENU_HINTS, RESULT_HINTS, ROUND_HINTS, VIM_ROUND_HINTS, type Hint } from "./keys";
import { ProgressScreen } from "./progress/ProgressScreen";
import { ResultsScreen } from "./ResultsScreen";
import { PanelTitle, ReferencesContext, type References } from "./shell/panel";
import { loadPrefs, savePrefs, type ShellPrefs } from "./shell/prefs";
import { folderOf, itemById, modeOf, type ItemId } from "./shell/sections";
import { isControl, Shell, type TreeState } from "./shell/Shell";
import { TextTypingScreen } from "./TextTypingScreen";
import { TypingScreen } from "./TypingScreen";
import { chooseVimDrill, VimScreen } from "./VimScreen";
import { WeakTypingScreen } from "./WeakTypingScreen";
import { GdbScreen, type GdbDrill } from "./GdbScreen";
import { ShellScreen, type ShellDrill } from "./ShellScreen";
import { CompileScreen } from "./CompileScreen";
import { WaScreen } from "./WaScreen";
import { StlScreen } from "./StlScreen";
import { GuideScreen } from "./GuideScreen";
import { IcpcScreen } from "./IcpcScreen";
import { RegexScreen, type RegexDrill } from "./RegexScreen";
import type { GuideLearnItem, GuideLink } from "../guide/content";
import { parseRefHash } from "../ref/link";
import type { Lang } from "../ref/model";
import { RefScreen } from "./RefScreen";

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

const GDB_DRILLS: Partial<Readonly<Record<ItemId, GdbDrill>>> = {
  "gdb-learn": "learn",
  "gdb-commands": "commands",
  "gdb-output": "output",
};

const SHELL_DRILLS: Partial<Readonly<Record<ItemId, ShellDrill>>> = {
  "shell-learn": "learn",
  "shell-commands": "commands",
};

const REGEX_DRILLS: Partial<Readonly<Record<ItemId, RegexDrill>>> = {
  "regex-learn": "learn",
  "regex-practice": "practice",
};

/** The tree item of each language of the reference (T46, T47, ADR-T46-1, ADR-T47-1). */
const REF_ITEMS: Readonly<Record<Lang, ItemId>> = { cpp: "ref-cpp", py: "ref-py" };

/** The reference item a `#<lang>/<id>` hash opens, if any. */
function hashItem(): ItemId | null {
  const target = parseRefHash(window.location.hash);
  return target === null ? null : REF_ITEMS[target.lang];
}

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

/** Matching sessions in this configuration, oldest first. */
function matchingSessions(
  history: readonly SessionRecord[],
  mode: Mode,
  params: JsonValue,
  durationMs: number,
): SessionRecord[] {
  return history.filter(
    (r) =>
      r.mode === mode &&
      // Review items change every round, so only the mode counts.
      (mode === "review" || (r.durationMs === durationMs && sameJson(r.params, params))),
  );
}

/** Scores of the rounds played in this configuration, oldest first. */
function scoresOf(
  history: readonly SessionRecord[],
  mode: Mode,
  params: JsonValue,
  durationMs: number,
): number[] {
  return matchingSessions(history, mode, params, durationMs).map(
    (r) => r.log.filter((a) => a.outcome === "correct").length,
  );
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
  const [adaptive, setAdaptive] = useState<AdaptiveSettings>(() => loadAdaptiveSettings(store));
  const [deckRev, setDeckRev] = useState(0);
  const [prefs, setPrefs] = useState<ShellPrefs>(() => loadPrefs(store));
  const [item, setItem] = useState<ItemId>(
    () => hashItem() ?? firstItem(loadPrefs(store), settings.mode),
  );
  const [screen, setScreen] = useState<Screen>({ name: "menu" });
  // A typing or Vim round is being played: the tree hides.
  const [running, setRunning] = useState(false);
  // Lesson to open when jumping to Aprender from a "Comandos" panel (T20 AC-5, T25 AC-6).
  const [learnLesson, setLearnLesson] = useState<string | null>(null);
  const [gdbLesson, setGdbLesson] = useState<string | null>(null);
  const [shellLesson, setShellLesson] = useState<string | null>(null);
  const [regexLesson, setRegexLesson] = useState<string | null>(null);
  // Section to focus when jumping to Evolução from an item's history (T23 AC-5).
  const [progressFocus, setProgressFocus] = useState<string | null>(null);
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

  const updateAdaptive = useCallback(
    (patch: Partial<AdaptiveSettings>) => {
      setAdaptive((prev) => {
        const next = { ...prev, ...patch };
        saveAdaptiveSettings(store, next);
        return next;
      });
    },
    [store],
  );

  const nowWall = clock.wallTime();
  // Read again each time the menu shows or the deck changes, so the last session counts.
  const history = useMemo(
    () => (screen.name === "menu" && deckRev >= 0 ? loadHistory(store) : []),
    [screen.name, store, deckRev],
  );
  const reviewDeck = useMemo(
    () => syncReviewDeck(store, history, nowWall),
    [store, history, nowWall],
  );
  const dueCards = useMemo(() => dueReviewCards(reviewDeck, nowWall), [reviewDeck, nowWall]);
  const dueCalcCards = useMemo(
    () => dueCards.filter((c): c is CalcReviewCard => c.kind === "calc"),
    [dueCards],
  );
  const dueVimCards = useMemo(
    () => dueCards.filter((c): c is VimReviewCard => c.kind === "vim-motion"),
    [dueCards],
  );
  const reviewCount = dueCards.length;
  const matched = matchingSessions(
    history,
    settings.mode,
    settings[settings.mode],
    settings.durationS * 1000,
  );
  const scores = matched.map((r) => r.log.filter((a) => a.outcome === "correct").length);
  const modePoints: RoundPoint[] = matched.map((r) => {
    const correct = r.log.filter((a) => a.outcome === "correct").length;
    const minutes = r.durationMs / 60_000;
    return { at: r.finishedAt, score: minutes > 0 ? correct / minutes : correct };
  });
  const modeRate = weeklyRate(modePoints, nowWall);
  const modePlateau = detectPlateau(modePoints);
  const modeEvents = useMemo(
    () => history.filter((s) => s.mode === settings.mode).flatMap(sessionEvents),
    [history, settings.mode],
  );
  const modeRecommendations = useMemo(
    () =>
      recommendForDrill({
        drillId: settings.mode,
        plateau: modePlateau,
        events: modeEvents,
        kcs: kcStats(modeEvents),
        now: nowWall,
        labelOfKc: skillLabel,
      }),
    [settings.mode, modePlateau, modeEvents, nowWall],
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
    if (id !== "gdb-learn") setGdbLesson(null);
    if (id !== "shell-learn") setShellLesson(null);
    if (id !== "regex-learn") setRegexLesson(null);
    if (id !== "progress") setProgressFocus(null);
    setItem(id);
    updatePrefs({ item: id });
    setRunning(false);
    setScreen({ name: "menu" });
  };

  // A `#<lang>/<id>` link opens the reference on that entry (T46 AC-6).
  const latestChoose = useRef(choose);
  useEffect(() => {
    latestChoose.current = choose;
  });
  useEffect(() => {
    const onHash = () => {
      const id = hashItem();
      if (id !== null) latestChoose.current(id);
    };
    window.addEventListener("hashchange", onHash);
    return () => {
      window.removeEventListener("hashchange", onHash);
    };
  }, []);

  const backToMode = () => {
    choose(settings.mode);
  };

  const start = () => {
    saveSettings(store, settings);
    let params: JsonValue = settings[settings.mode];
    if (settings.mode === "review") {
      // Due FSRS calculation cards come from the deck at start, never from settings.
      const deck = syncReviewDeck(store, loadHistory(store), clock.wallTime());
      const items = dueReviewCards(deck, clock.wallTime())
        .filter((c): c is CalcReviewCard => c.kind === "calc")
        .map((c) => c.item);
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
      const finishedAt = clock.wallTime();
      const record: SessionRecord = {
        version: 1,
        mode,
        finishedAt,
        durationMs,
        seed,
        params,
        log: session.log,
      };
      appendSession(store, record);
      const allEvents = loadAllEvents(store);
      recordSessionReview(store, record, allEvents, finishedAt);
      const currentAdaptive = loadAdaptiveSettings(store);
      if (
        (mode === "arithmetic" || mode === "estimation" || mode === "sums") &&
        currentAdaptive.autoLevel[mode]
      ) {
        const elo = replayElo(allEvents, finishedAt);
        const modeRatings = Object.entries(elo.users)
          .filter(([kc]) => kc.startsWith(`${mode}.`))
          .map(([, entry]) => entry.rating);
        const userRating =
          modeRatings.length > 0
            ? modeRatings.reduce((a, b) => a + b, 0) / modeRatings.length
            : INITIAL_ELO;
        const count = drillLevelCount(mode);
        const ratings = defaultLevelRatings(count);
        setSettings((prev) => {
          const curLevel =
            mode === "arithmetic"
              ? levelOfArithmetic(prev.arithmetic)
              : mode === "estimation"
                ? levelOfEstimation(prev.estimation)
                : levelOfSums(prev.sums);
          const nextLevel = chooseNextLevel({
            currentLevel: curLevel,
            userRating,
            levelRatings: ratings,
            targetAccuracy: currentAdaptive.targetAccuracy,
          });
          const nextSettings: StoredSettings =
            mode === "arithmetic"
              ? { ...prev, arithmetic: arithmeticForLevel(nextLevel, prev.arithmetic) }
              : mode === "estimation"
                ? { ...prev, estimation: estimationForLevel(nextLevel) }
                : { ...prev, sums: sumsForLevel(nextLevel) };
          saveSettings(store, nextSettings);
          return nextSettings;
        });
      }
      setDeckRev((n) => n + 1);
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
                .querySelector<HTMLElement>(
                  "[data-panel=area] textarea, [data-panel=area] input, [data-panel=area] [data-autofocus]",
                )
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
          onProgress={(sectionId) => {
            setProgressFocus(sectionId);
            choose("progress");
          }}
          initialLesson={learnLesson}
          readOnly={touch}
        />
      );
    }
    const gdbDrill = GDB_DRILLS[item];
    if (gdbDrill !== undefined) {
      return (
        <GdbScreen
          key={item}
          drill={gdbDrill}
          clock={clock}
          store={store}
          newSeed={newSeed}
          onBack={backToMode}
          onRunning={setRunning}
          onLearn={(lessonId) => {
            setGdbLesson(lessonId ?? null);
            choose("gdb-learn");
          }}
          onPractice={() => {
            choose("gdb-commands");
          }}
          onPracticeOutput={() => {
            choose("gdb-output");
          }}
          initialLesson={gdbLesson}
        />
      );
    }
    const shellDrill = SHELL_DRILLS[item];
    if (shellDrill !== undefined) {
      return (
        <ShellScreen
          key={item}
          drill={shellDrill}
          clock={clock}
          store={store}
          newSeed={newSeed}
          onBack={backToMode}
          onRunning={setRunning}
          onLearn={(lessonId) => {
            setShellLesson(lessonId ?? null);
            choose("shell-learn");
          }}
          onPractice={() => {
            choose("shell-commands");
          }}
          initialLesson={shellLesson}
        />
      );
    }
    const regexDrill = REGEX_DRILLS[item];
    if (regexDrill !== undefined) {
      return (
        <RegexScreen
          key={item}
          drill={regexDrill}
          clock={clock}
          store={store}
          newSeed={newSeed}
          onBack={backToMode}
          onRunning={setRunning}
          onLearn={(lessonId) => {
            setRegexLesson(lessonId ?? null);
            choose("regex-learn");
          }}
          onPractice={() => {
            choose("regex-practice");
          }}
          initialLesson={regexLesson}
        />
      );
    }
    switch (item) {
      case "compile-read":
        return (
          <CompileScreen
            clock={clock}
            store={store}
            newSeed={newSeed}
            onBack={backToMode}
            onRunning={setRunning}
          />
        );
      case "wa-hunt":
        return (
          <WaScreen
            clock={clock}
            store={store}
            newSeed={newSeed}
            onBack={backToMode}
            onRunning={setRunning}
          />
        );
      case "typing":
        return (
          <TypingScreen
            clock={clock}
            store={store}
            newSeed={newSeed}
            onBack={backToMode}
            onRunning={setRunning}
            onProgress={() => {
              setProgressFocus("typing");
              choose("progress");
            }}
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
            onProgress={() => {
              setProgressFocus("text");
              choose("progress");
            }}
          />
        );
      case "typing-weak":
        return (
          <WeakTypingScreen
            clock={clock}
            store={store}
            newSeed={newSeed}
            onBack={backToMode}
            onRunning={setRunning}
            onOpenText={() => {
              choose("text");
            }}
          />
        );
      case "ref-cpp":
        return <RefScreen key="cpp" lang="cpp" />;
      case "ref-py":
        return <RefScreen key="py" lang="py" />;
      case "data":
        return (
          <div className="screen data">
            <PanelTitle title="Dados">Exporte ou importe tudo o que o app guarda.</PanelTitle>
            <div data-panel="options">
              <DataPanel store={store} clock={clock} />
            </div>
          </div>
        );
      case "daily":
        return (
          <DailyScreen
            store={store}
            clock={clock}
            newSeed={newSeed}
            onRunning={setRunning}
            onChooseItem={(targetId, level) => {
              if (level !== undefined) {
                if (targetId === "vim-motion") {
                  const cur = loadVimSettings(store);
                  saveVimSettings(store, { ...cur, level: level as typeof cur.level });
                } else if (targetId === "arithmetic") {
                  setSettings((prev) => ({
                    ...prev,
                    arithmetic: arithmeticForLevel(level, prev.arithmetic),
                  }));
                } else if (targetId === "estimation") {
                  setSettings((prev) => ({ ...prev, estimation: estimationForLevel(level) }));
                } else if (targetId === "sums") {
                  setSettings((prev) => ({ ...prev, sums: sumsForLevel(level) }));
                }
              }
              choose(targetId);
            }}
          />
        );
      case "progress":
        return (
          <ProgressScreen
            store={store}
            clock={clock}
            focusItem={progressFocus}
            onLearn={(lessonId) => {
              setLearnLesson(lessonId);
              choose("vim-learn");
            }}
          />
        );
      case "stl":
        return (
          <StlScreen
            clock={clock}
            store={store}
            newSeed={newSeed}
            onBack={backToMode}
            onRunning={setRunning}
          />
        );
      case "guide": {
        const lessonSetters: Readonly<Record<GuideLearnItem, (id: string | null) => void>> = {
          "vim-learn": setLearnLesson,
          "gdb-learn": setGdbLesson,
          "shell-learn": setShellLesson,
          "regex-learn": setRegexLesson,
        };
        const openGuideLink = (link: GuideLink) => {
          if (link.kind === "lesson") lessonSetters[link.item](link.lesson);
          choose(link.item);
        };
        return <GuideScreen store={store} onOpenLink={openGuideLink} />;
      }
      case "icpc":
        return (
          <IcpcScreen
            clock={clock}
            store={store}
            newSeed={newSeed}
            onBack={backToMode}
            onRunning={setRunning}
          />
        );
      default: {
        const autoDrill: AutoLevelDrill | null =
          settings.mode === "arithmetic" ||
          settings.mode === "estimation" ||
          settings.mode === "sums"
            ? settings.mode
            : null;
        const autoLevelCurrent =
          autoDrill === "arithmetic"
            ? levelOfArithmetic(settings.arithmetic)
            : autoDrill === "estimation"
              ? levelOfEstimation(settings.estimation)
              : autoDrill === "sums"
                ? levelOfSums(settings.sums)
                : undefined;
        return (
          <ConfigScreen
            settings={settings}
            reviewCount={settings.mode === "review" ? dueCalcCards.length : reviewCount}
            onChange={setSettings}
            onStart={start}
            history={scores}
            weeklyRate={modeRate}
            plateau={modePlateau}
            onProgress={() => {
              setProgressFocus(settings.mode);
              choose("progress");
            }}
            autoLevel={autoDrill !== null ? adaptive.autoLevel[autoDrill] : false}
            autoLevelCurrent={autoLevelCurrent}
            targetAccuracy={adaptive.targetAccuracy}
            onAutoLevelChange={
              autoDrill !== null
                ? (enabled) => {
                    updateAdaptive({
                      autoLevel: { ...adaptive.autoLevel, [autoDrill]: enabled },
                    });
                  }
                : undefined
            }
            onTargetAccuracyChange={(targetAccuracy) => {
              updateAdaptive({ targetAccuracy });
            }}
            recommendations={modeRecommendations}
            vimReviewCards={settings.mode === "review" ? dueVimCards : []}
            onMarkVimCard={(cardId, rating) => {
              reviewVimCardAttempt(store, cardId, rating, clock.wallTime());
              setDeckRev((n) => n + 1);
            }}
          />
        );
      }
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
