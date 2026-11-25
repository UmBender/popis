import type { Entry } from "./model";

/** Lower case, no accents, single spaces. */
export function normalize(text: string): string {
  void text;
  throw new Error("todo");
}

/** Entries matching every term of the query, best first (ADR-T46-1). */
export function search(entries: readonly Entry[], query: string): readonly Entry[] {
  void entries;
  void query;
  throw new Error("todo");
}
