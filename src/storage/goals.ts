import { parseDay, type GoalLine } from "../stats/learning";
import { readJson, tryWriteJson, type KeyValueStore } from "./kv";

export const GOALS_KEY = "popis.goals.v1";

export type StoredGoals = Readonly<Record<string, GoalLine>>;

function isGoalLine(value: unknown): value is GoalLine {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r["target"] === "number" &&
    Number.isFinite(r["target"]) &&
    typeof r["deadline"] === "string" &&
    parseDay(r["deadline"]) !== null &&
    typeof r["setAt"] === "number" &&
    Number.isFinite(r["setAt"]) &&
    typeof r["baseline"] === "number" &&
    Number.isFinite(r["baseline"])
  );
}

/** Stored goals per config key; invalid entries are ignored. */
export function loadGoals(store: KeyValueStore): StoredGoals {
  const raw = readJson(store, GOALS_KEY);
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return {};
  const out: Record<string, GoalLine> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (isGoalLine(value)) out[key] = value;
  }
  return out;
}

export function saveGoal(store: KeyValueStore, key: string, goal: GoalLine): void {
  const next = { ...loadGoals(store), [key]: goal };
  tryWriteJson(store, GOALS_KEY, next);
}

export function removeGoal(store: KeyValueStore, key: string): void {
  const current = { ...loadGoals(store) };
  delete current[key];
  tryWriteJson(store, GOALS_KEY, current);
}
