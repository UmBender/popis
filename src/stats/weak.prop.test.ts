import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { TrainingEvent } from "./event";
import { DAY_MS } from "./summary";
import { selectWeakSpots } from "./weak";

const NOW = Date.UTC(2026, 10, 22, 12);

const wordArb = fc.stringMatching(/^[a-z;>+=]{2,6}$/);

const typingEventArb: fc.Arbitrary<TrainingEvent> = fc
  .tuple(
    fc.constantFrom<"typing.text" | "typing.weak">("typing.text", "typing.weak"),
    wordArb,
    fc.integer({ min: 0, max: 1 }),
    fc.integer({ min: 0, max: 20 }),
    fc.array(fc.integer({ min: 20, max: 600 }), { minLength: 6, maxLength: 8 }),
    fc.array(fc.tuple(fc.constantFrom("a", "q", ";", ">"), fc.constant("x")), {
      minLength: 0,
      maxLength: 2,
    }),
  )
  .map(([drill, word, i, daysAgo, iv, bad]) => ({
    at: NOW - daysAgo * DAY_MS,
    drill,
    config: drill === "typing.weak" ? "weak" : "en-30s",
    kc: drill === "typing.weak" ? `typing.ngram.${word.slice(0, 2)}` : "word",
    ok: bad.length === 0,
    timeMs: iv.reduce((a, b) => a + b, 0),
    extra: { seed: 1, i, w: word, iv, bad },
  }));

describe("weak selection properties", () => {
  it("selection does not depend on the order of events", () => {
    fc.assert(
      fc.property(
        fc.array(typingEventArb, { minLength: 0, maxLength: 40 }),
        fc.integer({ min: 0, max: 1_000_000 }),
        (events, seed) => {
          // Deterministic Fisher-Yates shuffle driven by `seed`
          const shuffled = [...events];
          let s = seed >>> 0;
          for (let i = shuffled.length - 1; i > 0; i--) {
            s = (Math.imul(s, 1_664_525) + 1_013_904_223) >>> 0;
            const j = s % (i + 1);
            const tmp = shuffled[i] as TrainingEvent;
            shuffled[i] = shuffled[j] as TrainingEvent;
            shuffled[j] = tmp;
          }

          const a = selectWeakSpots(events, NOW);
          const b = selectWeakSpots(shuffled, NOW);
          expect(b).toEqual(a);
        },
      ),
    );
  });
});
