import { clusterSnippets } from "./cluster";
import { buildInventory } from "./inventory";
import { buildProfile } from "./profile";
import { compareCodePoints } from "./recency";
import { buildReport } from "./report";
import { detectTemplate } from "./template";
import type { LibraryFile, MineOptions, MineOutput, RepoFile, SnippetCluster } from "./types";

const DEFAULT_MAX_SNIPPETS = 30;

function assignFilenames(
  clusters: readonly SnippetCluster[],
  reserveTemplate: boolean,
): readonly (SnippetCluster & { readonly filename: string })[] {
  const used = new Set<string>(["profile.json"]);
  if (reserveTemplate) used.add("template.cpp");

  return clusters.map((cluster) => {
    const ext = cluster.language === "cpp" ? "cpp" : "py";
    let candidate = `${cluster.name}.${ext}`;
    let suffix = 2;
    while (used.has(candidate)) {
      candidate = `${cluster.name}_${suffix}.${ext}`;
      suffix++;
    }
    used.add(candidate);
    return { ...cluster, filename: candidate };
  });
}

/** Run the complete deterministic mining pipeline and assemble output files and report. */
export function mineLibrary(files: readonly RepoFile[], options: MineOptions): MineOutput {
  const inventory = buildInventory(files);
  const template = detectTemplate(inventory.owned);
  const maxSnippets = options.maxSnippets ?? DEFAULT_MAX_SNIPPETS;
  const snippets = clusterSnippets(inventory.owned).slice(0, maxSnippets);
  const namedSnippets = assignFilenames(snippets, template !== null);
  const profile = buildProfile(inventory.owned);

  const outputFiles: LibraryFile[] = [];
  if (template) {
    outputFiles.push({ filename: "template.cpp", content: template.code });
  }
  for (const snippet of namedSnippets) {
    outputFiles.push({ filename: snippet.filename, content: snippet.canonicalCode });
  }
  outputFiles.push({
    filename: "profile.json",
    content: `${JSON.stringify(profile, null, 2)}\n`,
  });
  outputFiles.sort((a, b) => compareCodePoints(a.filename, b.filename));

  const report = buildReport({
    commitSha: options.commitSha,
    inventory,
    template,
    snippets: namedSnippets,
    profile,
  });

  return {
    inventory,
    template,
    snippets,
    profile,
    files: outputFiles,
    report,
  };
}
