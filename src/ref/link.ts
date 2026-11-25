import type { Lang } from "./model";

export type RefTarget = { readonly lang: Lang; readonly id: string };

/** The hash that opens an entry, from "cpp/lower_bound"; throws on an unknown entry. */
export function refLink(ref: string): string {
  void ref;
  throw new Error("todo");
}

/** Reads "#cpp/lower_bound" (or without "#"); null for any other hash. */
export function parseRefHash(hash: string): RefTarget | null {
  void hash;
  throw new Error("todo");
}
