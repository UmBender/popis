import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { dayOf } from "../stats/summary";
import { buildAgenda, DAY_MS, HOUR_MS, mergeContests } from "./agenda";
import { SITES, type Contest } from "./model";

const NOW = Date.UTC(2026, 10, 26, 12, 0, 0);

const contestArb: fc.Arbitrary<Contest> = fc
  .record({
    site: fc.constantFrom(...SITES),
    id: fc.constantFrom("a", "b", "c", "d", "e"),
    name: fc.string({ minLength: 1, maxLength: 30 }),
    startMs: fc.integer({ min: NOW - 5 * DAY_MS, max: NOW + 25 * DAY_MS }),
    durationMs: fc.integer({ min: 30 * 60_000, max: 3 * DAY_MS }),
  })
  .map((c) => ({ ...c, url: `https://example.test/${c.site}/${c.id}` }));

describe("agenda properties", () => {
  it("merged contests are always sorted by startMs and deduplicated by site and id", () => {
    fc.assert(
      fc.property(
        fc.array(fc.array(contestArb, { maxLength: 15 }), { maxLength: 4 }),
        (sources) => {
          const merged = mergeContests(sources);

          for (let i = 1; i < merged.length; i += 1) {
            expect(merged[i]!.startMs).toBeGreaterThanOrEqual(merged[i - 1]!.startMs);
          }
          const keys = merged.map((c) => `${c.site}:${c.id}`);
          expect(new Set(keys).size).toBe(keys.length);
        },
      ),
    );
  });

  it("merging is idempotent", () => {
    fc.assert(
      fc.property(fc.array(contestArb, { maxLength: 30 }), (list) => {
        const once = mergeContests([list]);
        const twice = mergeContests([once]);
        const doubled = mergeContests([once, once]);

        expect(twice).toEqual(once);
        expect(doubled).toEqual(once);
      }),
    );
  });

  it("buildAgenda never includes finished contests, keeps outputs sorted and preserves every upcoming item across day groups", () => {
    fc.assert(
      fc.property(
        fc.array(contestArb, { maxLength: 40 }),
        fc.integer({ min: -12, max: 14 }),
        (list, offsetHours) => {
          const localDay = (ms: number) => dayOf(ms + offsetHours * HOUR_MS);
          const agenda = buildAgenda(list, NOW, localDay);

          for (const c of [...agenda.running, ...agenda.upcoming]) {
            expect(c.startMs + c.durationMs).toBeGreaterThan(NOW);
          }
          for (const c of agenda.running) {
            expect(c.startMs).toBeLessThanOrEqual(NOW);
          }
          for (const c of agenda.upcoming) {
            expect(c.startMs).toBeGreaterThan(NOW);
            expect(c.startMs).toBeLessThanOrEqual(NOW + 14 * DAY_MS);
          }
          for (let i = 1; i < agenda.running.length; i += 1) {
            expect(agenda.running[i]!.startMs).toBeGreaterThanOrEqual(
              agenda.running[i - 1]!.startMs,
            );
          }
          for (let i = 1; i < agenda.upcoming.length; i += 1) {
            expect(agenda.upcoming[i]!.startMs).toBeGreaterThanOrEqual(
              agenda.upcoming[i - 1]!.startMs,
            );
          }
          expect(agenda.days.flatMap((g) => g.contests)).toEqual(agenda.upcoming);
        },
      ),
    );
  });
});
