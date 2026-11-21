import type { GoalLine } from "../stats/learning";
import type { KeyValueStore } from "./kv";

export const GOALS_KEY = "popis.goals.v1";

export type StoredGoals = Readonly<Record<string, GoalLine>>;

export function loadGoals(_store: KeyValueStore): StoredGoals {
  throw new Error("todo");
}

export function saveGoal(_store: KeyValueStore, _key: string, _goal: GoalLine): void {
  throw new Error("todo");
}

export function removeGoal(_store: KeyValueStore, _key: string): void {
  throw new Error("todo");
}
