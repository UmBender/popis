import { formatDate } from "./recency";
import type { InventoryResult, SnippetCluster, StyleProfile, TemplateResult } from "./types";

export interface ReportInput {
  readonly commitSha: string;
  readonly inventory: InventoryResult;
  readonly template: TemplateResult | null;
  readonly snippets: readonly (SnippetCluster & { readonly filename: string })[];
  readonly profile: StyleProfile;
}

/** Generate the Portuguese review report (`docs/architecture/Biblioteca de trechos.md`). */
export function buildReport(input: ReportInput): string {
  const { commitSha, inventory, template, snippets, profile } = input;
  const lines: string[] = [
    "---",
    "tags: [architecture]",
    `source_commit: ${commitSha}`,
    "---",
    "",
    "# Biblioteca de trechos",
    "",
    "> [!IMPORTANT]",
    "> Todo arquivo em `src/typing/library/` e publicado publicamente junto com o site.",
    "> Revise os trechos abaixo, desmarque e apague o que nao quiser publicar antes do merge e antes de rodar a T32.",
    "",
    `Commit analisado do repositorio \`comp\`: \`${commitSha}\``,
    "",
    "## Inventario",
    "",
    "| Categoria | Arquivos |",
    "| --- | ---: |",
    `| Do dono | ${inventory.owned.length} |`,
    `| De terceiros | ${inventory.thirdParty.length} |`,
    `| Duplicados | ${inventory.duplicates.length} |`,
    `| Marcados | ${inventory.flagged.length} |`,
    "",
    "## Template",
    "",
  ];

  if (template) {
    lines.push(
      `- [x] manter \`template.cpp\` — ${template.recentFileCount} arquivo(s) nos ultimos 6 meses (${template.fileCount} no total), ${template.firstSeen} a ${template.lastSeen}, variante: \`${template.canonicalPath}\``,
    );
  } else {
    lines.push("Nenhum template detectado.");
  }

  lines.push("", "## Trechos", "");
  if (snippets.length === 0) {
    lines.push("Nenhum trecho extraido.");
  } else {
    for (const s of snippets) {
      lines.push(
        `- [x] manter \`${s.filename}\` — **${s.name}** (${s.fileCount} arquivo(s), ${s.firstSeen} a ${s.lastSeen}, variante: \`${s.canonicalPath}\`)`,
      );
    }
  }

  lines.push(
    "",
    "## Perfil de estilo (`profile.json`)",
    "",
    `- Identificadores: ${profile.identifiers.length}`,
    `- Idiomas de uma linha: ${profile.idioms.length}`,
    `- Constantes: ${profile.constants.length}`,
    "",
    "## Arquivos marcados",
    "",
  );

  if (inventory.flagged.length === 0) {
    lines.push("Nenhum arquivo marcado.");
  } else {
    for (const f of inventory.flagged) {
      lines.push(`- \`${f.path}\` (${formatDate(f.createdAt)}) — ${f.reason}`);
    }
  }

  lines.push("");
  return lines.join("\n");
}
