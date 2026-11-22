import { extractItems, toShortName } from "./extract";
import { compareCodePoints, compareRecency, formatDate, parseTimestampMs } from "./recency";
import type { ExtractedItem, Language, RepoFile, SnippetCluster } from "./types";

export { toShortName };

const SIMILARITY_THRESHOLD = 0.58;

interface UniqueNode {
  readonly language: Language;
  readonly shingles: ReadonlyMap<string, number>;
  readonly shingleTotal: number;
  readonly items: ExtractedItem[];
}

function buildShingles(tokens: readonly string[]): {
  shingles: Map<string, number>;
  total: number;
} {
  const shingles = new Map<string, number>();
  const count = tokens.length - 2;
  for (let i = 0; i < count; i++) {
    const gram = `${tokens[i]!}\0${tokens[i + 1]!}\0${tokens[i + 2]!}`;
    shingles.set(gram, (shingles.get(gram) ?? 0) + 1);
  }
  return { shingles, total: count };
}

function diceSimilarity(a: UniqueNode, b: UniqueNode): number {
  let intersection = 0;
  for (const [gram, countA] of a.shingles) {
    const countB = b.shingles.get(gram);
    if (countB !== undefined) {
      intersection += countA < countB ? countA : countB;
    }
  }
  return (2 * intersection) / (a.shingleTotal + b.shingleTotal);
}

function findRoot(parent: number[], x: number): number {
  const p = parent[x]!;
  if (p === x) return x;
  const root = findRoot(parent, p);
  parent[x] = root;
  return root;
}

/**
 * Extract definitions from files and cluster near-identical variants by normalized
 * token 3-gram similarity using connected components (order- and rename-invariant).
 */
export function clusterSnippets(files: readonly RepoFile[]): readonly SnippetCluster[] {
  const items = extractItems(files);
  if (items.length === 0) return [];

  // Collapse identical normalized token sequences first for speed and determinism.
  const byExact = new Map<string, UniqueNode>();
  for (const item of items) {
    const key = `${item.language}\0${item.tokens.join("\x1f")}`;
    const existing = byExact.get(key);
    if (existing) {
      existing.items.push(item);
    } else {
      const { shingles, total } = buildShingles(item.tokens);
      byExact.set(key, {
        language: item.language,
        shingles,
        shingleTotal: total,
        items: [item],
      });
    }
  }

  const nodes = [...byExact.values()];
  const parent = nodes.map((_, i) => i);

  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i]!;
    for (let j = i + 1; j < nodes.length; j++) {
      const b = nodes[j]!;
      if (a.language !== b.language) continue;
      if (diceSimilarity(a, b) >= SIMILARITY_THRESHOLD) {
        const ra = findRoot(parent, i);
        const rb = findRoot(parent, j);
        if (ra !== rb) parent[rb] = ra;
      }
    }
  }

  const groups = new Map<number, ExtractedItem[]>();
  for (let i = 0; i < nodes.length; i++) {
    const root = findRoot(parent, i);
    const list = groups.get(root);
    if (list) list.push(...nodes[i]!.items);
    else groups.set(root, [...nodes[i]!.items]);
  }

  interface RankedCluster {
    readonly cluster: SnippetCluster;
    readonly canonical: ExtractedItem;
  }

  const ranked: RankedCluster[] = [];
  for (const groupItems of groups.values()) {
    let canonical = groupItems[0]!;
    let firstTs = parseTimestampMs(canonical.createdAt);
    let lastTs = firstTs;
    let firstSeen = formatDate(canonical.createdAt);
    let lastSeen = firstSeen;
    const pathSet = new Set<string>([canonical.path]);

    for (let i = 1; i < groupItems.length; i++) {
      const item = groupItems[i]!;
      pathSet.add(item.path);
      const cmp = compareRecency(item, canonical);
      if (cmp > 0 || (cmp === 0 && compareCodePoints(item.code, canonical.code) < 0)) {
        canonical = item;
      }
      const ts = parseTimestampMs(item.createdAt);
      if (ts < firstTs) {
        firstTs = ts;
        firstSeen = formatDate(item.createdAt);
      }
      if (ts > lastTs) {
        lastTs = ts;
        lastSeen = formatDate(item.createdAt);
      }
    }

    const variantPaths = [...pathSet].sort(compareCodePoints);
    ranked.push({
      canonical,
      cluster: {
        name: canonical.shortName,
        language: canonical.language,
        fileCount: variantPaths.length,
        firstSeen,
        lastSeen,
        canonicalPath: canonical.path,
        canonicalCode: canonical.code,
        variantPaths,
      },
    });
  }

  ranked.sort(
    (a, b) =>
      b.cluster.fileCount - a.cluster.fileCount ||
      compareRecency(b.canonical, a.canonical) ||
      compareCodePoints(a.cluster.name, b.cluster.name) ||
      compareCodePoints(a.cluster.canonicalCode, b.cluster.canonicalCode),
  );

  return ranked.map((r) => r.cluster);
}
