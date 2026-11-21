import { DEFAULT_TARGET_ACCURACY, type AutoLevelDrill } from "../stats/elo";
import type { KeyValueStore } from "./kv";

export const ADAPTIVE_KEY = "popis.adaptive.v1";

export type DailyMode = "interleaved" | "blocked";

export type DailySessionRecord = {
  readonly finishedAt: number;
  readonly week: string;
  readonly mode: DailyMode;
  readonly accuracy: number;
  readonly hitsPerMin: number;
  readonly itemsCompleted: number;
};

export type AdaptiveSettings = {
  readonly autoLevel: Readonly<Record<AutoLevelDrill, boolean>>;
  readonly targetAccuracy: number;
  readonly dailyMode: DailyMode;
  readonly dailyModeWeek: string | null;
  readonly dailySessions: readonly DailySessionRecord[];
};

export const DEFAULT_ADAPTIVE_SETTINGS: AdaptiveSettings = {
  autoLevel: {
    "vim-motion": false,
    arithmetic: false,
    estimation: false,
    sums: false,
  },
  targetAccuracy: DEFAULT_TARGET_ACCURACY,
  dailyMode: "interleaved",
  dailyModeWeek: null,
  dailySessions: [],
};

export function isoWeekOf(_ms: number): string {
  throw new Error("todo");
}

export function parseAdaptiveSettings(_value: unknown): AdaptiveSettings {
  throw new Error("todo");
}

export function loadAdaptiveSettings(_store: KeyValueStore): AdaptiveSettings {
  throw new Error("todo");
}

export function saveAdaptiveSettings(_store: KeyValueStore, _settings: AdaptiveSettings): void {
  throw new Error("todo");
}

export function appendDailySession(
  _store: KeyValueStore,
  _record: DailySessionRecord,
): AdaptiveSettings {
  throw new Error("todo");
}
