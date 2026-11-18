/** Settings of a mode whose only choice is which kinds of question to ask. */
export type KindSettings<K extends string> = { readonly kinds: readonly K[] };

export type KindError = "no-kind";

export function validateKinds<K extends string>(settings: KindSettings<K>): KindError[] {
  return settings.kinds.length === 0 ? ["no-kind"] : [];
}

/** Kind settings from untrusted JSON, deduplicated, or null when invalid. */
export function parseKinds<K extends string>(
  value: unknown,
  all: readonly K[],
): KindSettings<K> | null {
  if (typeof value !== "object" || value === null) return null;
  const kinds: unknown = (value as { kinds?: unknown }).kinds;
  if (!Array.isArray(kinds)) return null;
  const parsed: K[] = [];
  for (const kind of kinds as unknown[]) {
    if (!all.includes(kind as K)) return null;
    if (!parsed.includes(kind as K)) parsed.push(kind as K);
  }
  return parsed.length === 0 ? null : { kinds: parsed };
}
