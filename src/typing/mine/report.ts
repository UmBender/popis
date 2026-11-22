import type { InventoryResult, SnippetCluster, StyleProfile, TemplateResult } from "./types";

export interface ReportInput {
  readonly commitSha: string;
  readonly inventory: InventoryResult;
  readonly template: TemplateResult | null;
  readonly snippets: readonly (SnippetCluster & { readonly filename: string })[];
  readonly profile: StyleProfile;
}

export function buildReport(_input: ReportInput): string {
  throw new Error("todo");
}
