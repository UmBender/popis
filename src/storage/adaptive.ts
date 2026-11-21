import {
  AUTO_LEVEL_DRILLS,
  DEFAULT_TARGET_ACCURACY,
  MAX_TARGET_ACCURACY,
  MIN_TARGET_ACCURACY,
  type AutoLevelDrill,
} from "../stats/elo";
import { parseDay } from "../stats/learning";
import { DAY_MS, dayOf } from "../stats/summary";
import { readJson, tryWriteJson, type KeyValueStore } from "./kv";

export const ADAPTIVE_KEY = "popis.adaptive.v1";
const MAX_DAILY_SESSIONS = 200;

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

/** Pure UTC ISO-8601 week label `YYYY-Www` without using `Date`. */
export function isoWeekOf(ms: number): string {
  const dayNum = Math.floor(ms / DAY_MS);
  const dow = (((dayNum + 3) % 7) + 7) % 7; // Mon=0..Sun=6
  const thu = dayNum + (3 - dow);
  const year = dayOf(thu * DAY_MS).slice(0, 4);
  const jan4 = Math.floor((parseDay(`${year}-01-04`) as number) / DAY_MS);
  const jan4Dow = (((jan4 + 3) % 7) + 7) % 7;
  const w1Thu = jan4 + (3 - jan4Dow);
  const week = Math.floor((thu - w1Thu) / 7) + 1;
  return `${year}-W${String(week).padStart(2, "0")}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDailyMode(value: unknown): value is DailyMode {
  return value === "interleaved" || value === "blocked";
}

function isDailySessionRecord(value: unknown): value is DailySessionRecord {
  if (!isRecord(value)) return false;
  return (
    typeof value["finishedAt"] === "number" &&
    Number.isFinite(value["finishedAt"]) &&
    typeof value["week"] === "string" &&
    isDailyMode(value["mode"]) &&
    typeof value["accuracy"] === "number" &&
    Number.isFinite(value["accuracy"]) &&
    typeof value["hitsPerMin"] === "number" &&
    Number.isFinite(value["hitsPerMin"]) &&
    typeof value["itemsCompleted"] === "number" &&
    Number.isFinite(value["itemsCompleted"])
  );
}

export function parseAdaptiveSettings(value: unknown): AdaptiveSettings {
  if (!isRecord(value)) return DEFAULT_ADAPTIVE_SETTINGS;
  const rawAuto = isRecord(value["autoLevel"]) ? value["autoLevel"] : {};
  const autoLevel = Object.fromEntries(
    AUTO_LEVEL_DRILLS.map((d) => [d, rawAuto[d] === true]),
  ) as Record<AutoLevelDrill, boolean>;

  const rawTarget = value["targetAccuracy"];
  const targetAccuracy =
    typeof rawTarget === "number" &&
    Number.isFinite(rawTarget) &&
    rawTarget >= MIN_TARGET_ACCURACY &&
    rawTarget <= MAX_TARGET_ACCURACY
      ? rawTarget
      : DEFAULT_TARGET_ACCURACY;

  const dailyMode = isDailyMode(value["dailyMode"]) ? value["dailyMode"] : "interleaved";
  const dailyModeWeek =
    typeof value["dailyModeWeek"] === "string" ? value["dailyModeWeek"] : null;
  const rawSessions = Array.isArray(value["dailySessions"])
    ? value["dailySessions"].filter(isDailySessionRecord)
    : [];

  return {
    autoLevel,
    targetAccuracy,
    dailyMode,
    dailyModeWeek,
    dailySessions: rawSessions.slice(-MAX_DAILY_SESSIONS),
  };
}

export function loadAdaptiveSettings(store: KeyValueStore): AdaptiveSettings {
  return parseAdaptiveSettings(readJson(store, ADAPTIVE_KEY));
}

export function saveAdaptiveSettings(store: KeyValueStore, settings: AdaptiveSettings): void {
  tryWriteJson(store, ADAPTIVE_KEY, settings);
}

export function appendDailySession(
  store: KeyValueStore,
  record: DailySessionRecord,
): AdaptiveSettings {
  const current = loadAdaptiveSettings(store);
  const next: AdaptiveSettings = {
    ...current,
    dailySessions: [...current.dailySessions, record].slice(-MAX_DAILY_SESSIONS),
  };
  saveAdaptiveSettings(store, next);
  return next;
}
