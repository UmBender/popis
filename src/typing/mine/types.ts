export type Language = "cpp" | "python";

export interface RepoFile {
  readonly path: string;
  readonly content: string;
  readonly createdAt: string;
}

export interface ExcludedFile {
  readonly path: string;
  readonly reason: string;
}

export interface FlaggedFile {
  readonly path: string;
  readonly reason: string;
  readonly createdAt: string;
}

export interface InventoryResult {
  readonly owned: readonly RepoFile[];
  readonly thirdParty: readonly ExcludedFile[];
  readonly duplicates: readonly ExcludedFile[];
  readonly flagged: readonly FlaggedFile[];
}

export type ExtractedKind = "struct" | "function" | "lambda" | "loop";

export interface ExtractedItem {
  readonly kind: ExtractedKind;
  readonly rawName: string;
  readonly shortName: string;
  readonly language: Language;
  readonly code: string;
  readonly tokens: readonly string[];
  readonly path: string;
  readonly createdAt: string;
}

export interface SnippetCluster {
  readonly name: string;
  readonly language: Language;
  readonly fileCount: number;
  readonly firstSeen: string;
  readonly lastSeen: string;
  readonly canonicalPath: string;
  readonly canonicalCode: string;
  readonly variantPaths: readonly string[];
}

export interface TemplateResult {
  readonly code: string;
  readonly fileCount: number;
  readonly recentFileCount: number;
  readonly firstSeen: string;
  readonly lastSeen: string;
  readonly canonicalPath: string;
}

export interface CountEntry {
  readonly value: string;
  readonly count: number;
}

export interface StyleProfile {
  readonly identifiers: readonly CountEntry[];
  readonly idioms: readonly CountEntry[];
  readonly constants: readonly CountEntry[];
}

export interface LibraryFile {
  readonly filename: string;
  readonly content: string;
}

export interface MineOptions {
  readonly commitSha: string;
  readonly maxSnippets?: number;
}

export interface MineOutput {
  readonly inventory: InventoryResult;
  readonly template: TemplateResult | null;
  readonly snippets: readonly SnippetCluster[];
  readonly profile: StyleProfile;
  readonly files: readonly LibraryFile[];
  readonly report: string;
}

export type ValidationResult = { readonly ok: true } | { readonly ok: false; readonly reason: string };
