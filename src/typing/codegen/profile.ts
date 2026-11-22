import type { Rng } from "../../core/rng";
import profileJson from "../library/profile.json";
import type { CodegenProfile, ProfilePools, WeightedItem } from "./types";

export const DEFAULT_PROFILE: CodegenProfile = profileJson;

export function buildProfilePools(_profile: CodegenProfile): ProfilePools {
  throw new Error("todo");
}

export function weightedPick<T>(_rng: Rng, _items: readonly WeightedItem<T>[]): T {
  throw new Error("todo");
}

export function pickDistinct(
  _rng: Rng,
  _items: readonly WeightedItem<string>[],
  _used: Set<string>,
): string {
  throw new Error("todo");
}

export function idiomWeight(_profile: CodegenProfile, _patterns: readonly string[]): number {
  throw new Error("todo");
}
