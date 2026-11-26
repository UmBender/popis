import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { createRng } from "../core/rng";
import { compareStandings, computeScoreboard, VERDICTS, type Submission } from "./score";

// T43 AC-1 property tests: permutation of teams, adding an AC never worsens
// the team's rank, and scoreboard order is independent of log order.

const TEAMS = ["T1", "T2", "T3", "T4", "T5"] as const;
const PROBLEMS = ["A", "B", "C", "D", "E"] as const;

const submissionArb: fc.Arbitrary<Submission> = fc.record({
  team: fc.constantFrom(...TEAMS),
  problem: fc.constantFrom(...PROBLEMS),
  minute: fc.integer({ min: 0, max: 300 }),
  verdict: fc.constantFrom(...VERDICTS),
});

function shuffle<T>(items: readonly T[], seed: number): T[] {
  const rng = createRng(seed);
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = rng.int(0, i);
    const tmp = copy[i];
    copy[i] = copy[j] as T;
    copy[j] = tmp as T;
  }
  return copy;
}

describe("computeScoreboard properties (AC-1)", () => {
  it("scoreboard is always a permutation of the participating teams and sorted monotonically", () => {
    fc.assert(
      fc.property(
        fc.array(submissionArb, { maxLength: 40 }),
        fc.boolean(),
        fc.boolean(),
        (log, compileErrorCounts, includeAllTeams) => {
          const teamsOpt = includeAllTeams ? TEAMS : undefined;
          const board = computeScoreboard(log, { compileErrorCounts, teams: teamsOpt });

          const expectedTeams = new Set<string>(teamsOpt ?? []);
          for (const s of log) expectedTeams.add(s.team);

          expect(board).toHaveLength(expectedTeams.size);
          expect(new Set(board.map((r) => r.team))).toEqual(expectedTeams);

          for (let i = 0; i < board.length; i += 1) {
            const row = board[i];
            expect(row).toBeDefined();
            if (row === undefined) continue;
            const cells = Object.values(row.problems);
            expect(row.solved).toBe(cells.filter((c) => c.solved).length);
            expect(row.penalty).toBe(cells.reduce((acc, c) => acc + c.penalty, 0));

            if (i > 0) {
              const prev = board[i - 1]!;
              const cmp = compareStandings(prev, row);
              expect(cmp).toBeLessThanOrEqual(0);
              if (cmp === 0) {
                expect(row.rank).toBe(prev.rank);
                expect(prev.team < row.team).toBe(true);
              } else {
                expect(row.rank).toBe(i + 1);
              }
            } else {
              expect(row.rank).toBe(1);
            }
          }
        },
      ),
    );
  });

  it("adding an AC submission never worsens the receiving team's rank or position", () => {
    fc.assert(
      fc.property(
        fc.array(submissionArb, { maxLength: 35 }),
        fc.constantFrom(...TEAMS),
        fc.constantFrom(...PROBLEMS),
        fc.integer({ min: 0, max: 300 }),
        fc.boolean(),
        (log, team, problem, minute, compileErrorCounts) => {
          const opts = { compileErrorCounts, teams: TEAMS, problems: PROBLEMS };
          const before = computeScoreboard(log, opts);
          const after = computeScoreboard([...log, { team, problem, minute, verdict: "AC" }], opts);

          const prevIdx = before.findIndex((r) => r.team === team);
          const nextIdx = after.findIndex((r) => r.team === team);
          const prevRow = before[prevIdx];
          const nextRow = after[nextIdx];

          expect(prevRow).toBeDefined();
          expect(nextRow).toBeDefined();
          expect(nextRow!.rank).toBeLessThanOrEqual(prevRow!.rank);
          expect(nextIdx).toBeLessThanOrEqual(prevIdx);
        },
      ),
    );
  });

  it("scoreboard does not depend on the order of submissions in the log", () => {
    fc.assert(
      fc.property(
        fc.array(submissionArb, { maxLength: 40 }),
        fc.integer({ min: 0, max: 0x7fffffff }),
        fc.boolean(),
        (log, shuffleSeed, compileErrorCounts) => {
          const opts = { compileErrorCounts, teams: TEAMS, problems: PROBLEMS };
          const original = computeScoreboard(log, opts);
          const permuted = computeScoreboard(shuffle(log, shuffleSeed), opts);
          expect(permuted).toEqual(original);
        },
      ),
    );
  });
});
