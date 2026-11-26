import { describe, expect, it } from "vitest";
import { entriesOf, LANGS } from "./langs";
import { parseRefHash, refLink } from "./link";
import type { Entry } from "./model";

// T47 AC-3: bidirectional C++ <-> Python pairs, at least 25.

const ALL: readonly Entry[] = LANGS.flatMap((lang) => entriesOf(lang));
const byRef = new Map(ALL.map((e) => [`${e.lang}/${e.id}`, e]));

describe("reference pairs", () => {
  it("every pair points both ways", () => {
    const paired = ALL.filter((e) => e.pair !== undefined);
    expect(paired.length).toBeGreaterThan(0);
    for (const entry of paired) {
      const selfRef = `${entry.lang}/${entry.id}`;
      const other = byRef.get(entry.pair ?? "");
      expect(other, `${selfRef} -> ${entry.pair ?? ""}`).toBeDefined();
      expect(other?.pair, `${entry.pair ?? ""} back to ${selfRef}`).toBe(selfRef);
    }
  });

  it("at least 25 bidirectional pairs exist", () => {
    const cppPaired = entriesOf("cpp").filter((e) => e.pair !== undefined);
    const pyPaired = entriesOf("py").filter((e) => e.pair !== undefined);
    expect(cppPaired.length).toBeGreaterThanOrEqual(25);
    expect(pyPaired.length).toBe(cppPaired.length);

    // Core pairs named in the T47 spec.
    for (const ref of [
      "cpp/priority_queue",
      "cpp/priority_queue_min",
      "cpp/deque",
      "cpp/lower_bound",
      "cpp/sort_lambda",
      "cpp/mod_negative",
      "cpp/int128",
    ]) {
      expect(byRef.get(ref)?.pair, ref).toMatch(/^py\//);
    }
  });

  it("every pair links across languages and resolves", () => {
    for (const entry of ALL) {
      if (entry.pair === undefined) continue;
      const target = parseRefHash(entry.pair);
      expect(target, `${entry.lang}/${entry.id}`).not.toBeNull();
      expect(target?.lang, `${entry.lang}/${entry.id}`).not.toBe(entry.lang);
      expect(refLink(entry.pair)).toBe(`#${entry.pair}`);
    }
  });
});
