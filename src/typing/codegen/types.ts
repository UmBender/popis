import type { Rng } from "../../core/rng";
import type { Language } from "../corpus";

export type CountEntry = {
  readonly value: string;
  readonly count: number;
};

export type CodegenProfile = {
  readonly identifiers: readonly CountEntry[];
  readonly idioms: readonly CountEntry[];
  readonly constants: readonly CountEntry[];
};

export type WeightedItem<T> = {
  readonly value: T;
  readonly weight: number;
};

export type ProfilePools = {
  readonly loopVars: readonly WeightedItem<string>[];
  readonly shortVars: readonly WeightedItem<string>[];
  readonly wordVars: readonly WeightedItem<string>[];
  readonly typeNames: readonly WeightedItem<string>[];
  readonly cppTypes: readonly WeightedItem<string>[];
  readonly modValues: readonly WeightedItem<string>[];
  readonly infValues: readonly WeightedItem<string>[];
  readonly limitValues: readonly WeightedItem<string>[];
  readonly constNames: readonly WeightedItem<string>[];
};

export type GeneratedSnippet = {
  readonly id: string;
  readonly language: Language;
  readonly seed: number;
  readonly rule: string;
  readonly text: string;
};

export type BurstSnippet = {
  readonly id: string;
  readonly language: Language;
  readonly seed: number;
  readonly rule: string;
  readonly idiom: string;
  readonly text: string;
  readonly repetitions: 5;
};

export type BurstSummary = {
  readonly timesMs: readonly number[];
  readonly ratio: number | null;
};

export type GrammarRule = {
  readonly name: string;
  readonly patterns: readonly string[];
  readonly generate: (rng: Rng, pools: ProfilePools) => string;
};

export type BurstRule = {
  readonly name: string;
  readonly patterns: readonly string[];
  readonly generate: (rng: Rng, pools: ProfilePools) => string;
};
