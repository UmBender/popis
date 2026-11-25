import { entriesOf, isLang } from "./langs";
import type { Lang } from "./model";

export type RefTarget = { readonly lang: Lang; readonly id: string };

const HASH = /^#?([a-z]+)\/([a-z0-9_]+)$/;

/** Reads "#cpp/lower_bound" (or without "#"); null for any other hash. */
export function parseRefHash(hash: string): RefTarget | null {
  if (!HASH.test(hash)) return null;
  const [lang, id] = hash.replace(/^#/, "").split("/") as [string, string];
  return isLang(lang) ? { lang, id } : null;
}

/** The hash that opens an entry, from "cpp/lower_bound"; throws on an unknown entry. */
export function refLink(ref: string): string {
  const target = parseRefHash(ref);
  if (target === null || !entriesOf(target.lang).some((e) => e.id === target.id)) {
    throw new Error(`unknown reference entry ${ref}`);
  }
  return `#${target.lang}/${target.id}`;
}
