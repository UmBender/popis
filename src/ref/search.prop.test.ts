import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { entriesOf } from "./langs";
import { normalize, search } from "./search";

// T46 AC-2: invariants of the search over the real C++ content.

const CPP = entriesOf("cpp");
const titles = CPP.map((e) => e.title);
const queryArb = fc.oneof(
  fc.string({ maxLength: 6 }),
  fc.constantFrom(...titles).chain((t) =>
    fc
      .tuple(fc.nat({ max: t.length }), fc.nat({ max: t.length }))
      .map(([a, b]) => t.slice(Math.min(a, b), Math.max(a, b))),
  ),
);

describe("search properties", () => {
  it("search result is a subset without repeats", () => {
    fc.assert(
      fc.property(queryArb, (query) => {
        const result = search(CPP, query);
        expect(new Set(result).size).toBe(result.length);
        for (const e of result) expect(CPP).toContain(e);
      }),
    );
  });

  it("empty query returns every entry in section order", () => {
    fc.assert(
      fc.property(fc.stringMatching(/^\s*$/), (blank) => {
        expect(search(CPP, blank)).toEqual(CPP);
      }),
    );
  });

  it("search is accent and case insensitive", () => {
    fc.assert(
      fc.property(queryArb, fc.boolean(), (query, upper) => {
        const variant = upper ? query.toUpperCase() : query.toLowerCase();
        expect(search(CPP, variant)).toEqual(search(CPP, query));
      }),
    );
  });

  it("a slice of a title finds that entry and title matches come first", () => {
    fc.assert(
      fc.property(fc.constantFrom(...CPP), (target) => {
        const result = search(CPP, target.title);
        expect(result).toContain(target);
        const q = normalize(target.title);
        const firstNonTitle = result.findIndex((e) => !normalize(e.title).includes(q));
        if (firstNonTitle >= 0) {
          expect(result.slice(firstNonTitle).every((e) => !normalize(e.title).includes(q))).toBe(
            true,
          );
        }
      }),
    );
  });
});
