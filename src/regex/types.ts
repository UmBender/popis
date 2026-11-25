import type { MatchMode, RegexDialect } from "./compile";

export const REGEX_ITEM_KINDS = ["casar", "extrair", "trocar", "ler"] as const;

export type RegexItemKind = (typeof REGEX_ITEM_KINDS)[number];

export const REGEX_KIND_LABELS: Readonly<Record<RegexItemKind, string>> = {
  casar: "Casar linhas",
  extrair: "Extrair grupo 1",
  trocar: "Trocar texto",
  ler: "Ler regex",
};

export type CasarItem = {
  readonly id: string;
  readonly kind: "casar";
  readonly kc: "regex.casar";
  readonly family: string;
  readonly dialect: RegexDialect;
  readonly mode: MatchMode;
  readonly prompt: string;
  readonly positive: readonly string[];
  readonly negative: readonly string[];
  readonly canonical: string;
  readonly canonicalByDialect: Readonly<Record<RegexDialect, string>>;
  readonly explanation: string;
};

export type ExtrairCase = {
  readonly line: string;
  readonly expected: string | null;
};

export type ExtrairItem = {
  readonly id: string;
  readonly kind: "extrair";
  readonly kc: "regex.extrair";
  readonly family: string;
  readonly dialect: RegexDialect;
  readonly mode: "search";
  readonly prompt: string;
  readonly cases: readonly ExtrairCase[];
  readonly canonical: string;
  readonly canonicalByDialect: Readonly<Record<RegexDialect, string>>;
  readonly explanation: string;
};

export type TrocarCase = {
  readonly before: string;
  readonly after: string;
};

export type TrocarCanonical = {
  readonly pattern: string;
  readonly replacement: string;
};

export type TrocarItem = {
  readonly id: string;
  readonly kind: "trocar";
  readonly kc: "regex.trocar";
  readonly family: string;
  readonly dialect: RegexDialect;
  readonly mode: "search";
  readonly prompt: string;
  readonly cases: readonly TrocarCase[];
  readonly canonical: string;
  readonly canonicalReplacement: string;
  readonly canonicalByDialect: Readonly<Record<RegexDialect, TrocarCanonical>>;
  readonly explanation: string;
};

export type LerItem = {
  readonly id: string;
  readonly kind: "ler";
  readonly kc: "regex.ler";
  readonly family: string;
  readonly dialect: RegexDialect;
  readonly mode: MatchMode;
  readonly prompt: string;
  readonly pattern: string;
  readonly lines: readonly string[];
  readonly expected: readonly boolean[];
  readonly canonical: string;
  readonly explanation: string;
};

export type RegexItem = CasarItem | ExtrairItem | TrocarItem | LerItem;
