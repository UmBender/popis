import type { Entry } from "./model";

/** Lower case, no accents, single spaces. */
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * How well an entry matches, lower is better (ADR-T46-1): the title starts with the
 * query, the title contains it, a tag, the signature, every term somewhere; null: no match.
 */
function rank(entry: Entry, query: string, terms: readonly string[]): number | null {
  const title = normalize(entry.title);
  const tags = entry.tags.map(normalize);
  const signature = normalize(entry.signature);
  if (title.startsWith(query)) return 0;
  if (title.includes(query)) return 1;
  if (tags.some((t) => t.includes(query))) return 2;
  if (signature.includes(query)) return 3;
  const all = [title, ...tags, signature].join("\n");
  return terms.every((t) => all.includes(t)) ? 4 : null;
}

/** Entries matching every term of the query, best first; ties keep the input order. */
export function search(entries: readonly Entry[], query: string): readonly Entry[] {
  const q = normalize(query);
  if (q === "") return entries;
  const terms = q.split(" ");
  return entries
    .map((entry, index) => ({ entry, index, score: rank(entry, q, terms) }))
    .filter((x): x is { entry: Entry; index: number; score: number } => x.score !== null)
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .map((x) => x.entry);
}
