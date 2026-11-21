import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { DAY_MS, dayOf } from "./summary";
import { fitPowerLaw, parseDay, theilSenSlope } from "./learning";

const NUM_RUNS = Number(process.env["FC_NUM_RUNS"] ?? 100);

describe("learning properties", () => {
  it("parseDay and dayOf are inverses over valid UTC days", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 40_000 }), (days) => {
        const ms = days * DAY_MS;
        expect(parseDay(dayOf(ms))).toBe(ms);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it("theilSenSlope recovers the exact slope of any collinear series", () => {
    fc.assert(
      fc.property(
        fc.double({ min: -50, max: 50, noNaN: true }),
        fc.double({ min: -10, max: 10, noNaN: true }),
        fc.integer({ min: 2, max: 20 }),
        (intercept, slope, n) => {
          const pts: [number, number][] = Array.from({ length: n }, (_, i) => [
            i + 1,
            intercept + slope * (i + 1),
          ]);
          const got = theilSenSlope(pts);
          expect(got).not.toBeNull();
          expect(Math.abs((got as number) - slope)).toBeLessThan(1e-9);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it("fitPowerLaw predictions are strictly increasing and bounded by a", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 40, max: 120, noNaN: true }),
        fc.double({ min: 10, max: 35, noNaN: true }),
        fc.double({ min: 0.25, max: 0.9, noNaN: true }),
        fc.integer({ min: 10, max: 30 }),
        (a, b, c, n) => {
          const pts = Array.from({ length: n }, (_, idx) => ({
            at: idx * DAY_MS,
            score: a - b * Math.pow(idx + 1, -c),
          }));
          const fit = fitPowerLaw(pts);
          expect(fit).not.toBeNull();
          if (fit !== null) {
            expect(fit.predict(1)).toBeLessThan(fit.predict(n));
            expect(fit.predict(n)).toBeLessThan(fit.a);
          }
        },
      ),
      { numRuns: Math.min(NUM_RUNS, 80) },
    );
  });
});
