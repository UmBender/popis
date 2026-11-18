import type { Generator } from "./core/problem";
import {
  arithmetic,
  DEFAULT_ARITHMETIC,
  parseArithmeticSettings,
  validateArithmetic,
  type ArithmeticSettings,
} from "./gen/arithmetic";
import { ALGEBRA_KINDS, algebra, DEFAULT_ALGEBRA, type AlgebraSettings } from "./gen/algebra";
import { DEFAULT_DIVISION, DIVISION_KINDS, division, type DivisionSettings } from "./gen/division";
import {
  DEFAULT_ESTIMATION,
  ESTIMATION_KINDS,
  estimation,
  type EstimationSettings,
} from "./gen/estimation";
import {
  DEFAULT_FACTORING,
  factoring,
  parseFactoringSettings,
  validateFactoring,
  type FactoringSettings,
} from "./gen/factoring";
import { parseKinds, validateKinds } from "./gen/kinds";

/** Settings of each mode; the stored settings keep one entry per mode id. */
export type ModeSettings = {
  arithmetic: ArithmeticSettings;
  factoring: FactoringSettings;
  division: DivisionSettings;
  algebra: AlgebraSettings;
  estimation: EstimationSettings;
};

export type Mode = keyof ModeSettings;

/** Everything the app needs to know about one mode. */
export type ModeSpec<S> = {
  readonly label: string;
  /** One line under the mode choice. */
  readonly hint: string;
  readonly generator: Generator<S>;
  readonly defaults: S;
  /** Settings from untrusted JSON, or null when invalid. */
  readonly parseSettings: (value: unknown) => S | null;
  /** Error codes; empty when the settings can start a session. */
  readonly validate: (settings: S) => readonly string[];
  /** Enter skips the question (Zetamac's arithmetic has no skip). */
  readonly allowSkip: boolean;
  /** Numeric keyboard on phones; text otherwise. */
  readonly numeric: boolean;
  /** Wide answer box for expressions. */
  readonly wide: boolean;
  /** What the results' per-skill table calls a skill. */
  readonly group: { readonly caption: string; readonly column: string };
};

const BY_TYPE = { caption: "Por tipo", column: "Tipo" } as const;

export const MODES: { readonly [M in Mode]: ModeSpec<ModeSettings[M]> } = {
  arithmetic: {
    label: "Aritmética",
    hint: "Responda o máximo de contas antes do tempo acabar.",
    generator: arithmetic,
    defaults: DEFAULT_ARITHMETIC,
    parseSettings: parseArithmeticSettings,
    validate: validateArithmetic,
    allowSkip: false,
    numeric: true,
    wide: false,
    group: { caption: "Por operação", column: "Operação" },
  },
  factoring: {
    label: "Fatoração",
    hint: "Digite a forma fatorada, como (x-5)(x+3). Enter pula a questão.",
    generator: factoring,
    defaults: DEFAULT_FACTORING,
    parseSettings: parseFactoringSettings,
    validate: validateFactoring,
    allowSkip: true,
    numeric: false,
    wide: true,
    group: BY_TYPE,
  },
  division: {
    label: "Divisão inteira",
    hint: "Divisão e resto com negativos, como no C++. Enter pula a questão.",
    generator: division,
    defaults: DEFAULT_DIVISION,
    parseSettings: (value) => parseKinds(value, DIVISION_KINDS),
    validate: validateKinds,
    allowSkip: true,
    numeric: false,
    wide: false,
    group: BY_TYPE,
  },
  algebra: {
    label: "Álgebra",
    hint: "Expanda, simplifique, complete o quadrado ou divida. Enter pula a questão.",
    generator: algebra,
    defaults: DEFAULT_ALGEBRA,
    parseSettings: (value) => parseKinds(value, ALGEBRA_KINDS),
    validate: validateKinds,
    allowSkip: true,
    numeric: false,
    wide: true,
    group: BY_TYPE,
  },
  estimation: {
    label: "Estimativa",
    hint: "Digite o número da opção certa. Enter pula a questão.",
    generator: estimation,
    defaults: DEFAULT_ESTIMATION,
    parseSettings: (value) => parseKinds(value, ESTIMATION_KINDS),
    validate: validateKinds,
    allowSkip: true,
    numeric: true,
    wide: false,
    group: BY_TYPE,
  },
};

/** Mode ids in menu order. */
export const MODE_IDS: readonly Mode[] = [
  "arithmetic",
  "factoring",
  "division",
  "algebra",
  "estimation",
];

export function isMode(value: unknown): value is Mode {
  return typeof value === "string" && (MODE_IDS as readonly string[]).includes(value);
}
