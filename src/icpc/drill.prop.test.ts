import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { checkIcpcAnswer } from "./check";
import {
  generateIcpcItem,
  ICPC_KINDS,
  ICPC_MAX_MINUTE,
  type IcpcItem,
  type IcpcKind,
} from "./drill";
import { compareStandings, computeScoreboard } from "./score";

// T43 AC-2 property tests: canonical answer is accepted, all minutes stay in
// 0..300, answer is unique and verified by computeScoreboard, and same seed
// always produces the same item.

function expectMinuteInRange(m: number, label: string) {
  expect(Number.isInteger(m), `${label} must be integer`).toBe(true);
  expect(m, `${label} >= 0`).toBeGreaterThanOrEqual(0);
  expect(m, `${label} <= 300`).toBeLessThanOrEqual(ICPC_MAX_MINUTE);
}

function verifyItemInvariants(item: IcpcItem) {
  expect(item.kc).toBe(`icpc.${item.kind}`);
  expect(item.prompt.length).toBeGreaterThan(10);
  expect(item.explanation.length).toBeGreaterThan(10);
  expect(checkIcpcAnswer(item.kind, item.canonical, item.canonical).ok).toBe(true);
  expectMinuteInRange(item.currentMinute, "currentMinute");

  const scoreOpts = { compileErrorCounts: item.compileErrorCounts };

  switch (item.kind) {
    case "penalidade": {
      for (const s of item.submissions) {
        expectMinuteInRange(s.minute, "penalidade submission minute");
      }
      const [row] = computeScoreboard(item.submissions, {
        ...scoreOpts,
        teams: [item.team],
        problems: item.problems,
      });
      expect(row).toBeDefined();
      expect(row).toEqual(item.standing);
      expect(item.canonical).toBe(String(row!.penalty));
      break;
    }

    case "posicao": {
      for (const s of item.submissions) {
        expectMinuteInRange(s.minute, "posicao submission minute");
      }
      expectMinuteInRange(item.newSubmission.minute, "newSubmission minute");
      const teams = item.before.map((r) => r.team);
      const before = computeScoreboard(item.submissions, {
        ...scoreOpts,
        teams,
        problems: item.problems,
      });
      expect(before).toEqual(item.before);

      const after = computeScoreboard([...item.submissions, item.newSubmission], {
        ...scoreOpts,
        teams,
        problems: item.problems,
      });
      expect(after).toEqual(item.after);

      const target = after.find((r) => r.team === item.newSubmission.team);
      expect(target).toBeDefined();
      // Unique rank: no other team ties the target on (solved, penalty, lastAcMinute).
      const tied = after.filter((r) => compareStandings(r, target!) === 0);
      expect(tied).toHaveLength(1);
      expect(item.canonical).toBe(String(target!.rank));
      break;
    }

    case "ultrapassar": {
      for (const s of item.submissions) {
        expectMinuteInRange(s.minute, "ultrapassar submission minute");
        expect(s.minute).toBeLessThanOrEqual(item.currentMinute);
      }
      const maxMinute = Number(item.canonical);
      expectMinuteInRange(maxMinute, "ultrapassar canonical minute");
      expect(maxMinute).toBeGreaterThanOrEqual(item.currentMinute);

      const teams = item.board.map((r) => r.team);
      const board = computeScoreboard(item.submissions, {
        ...scoreOpts,
        teams,
        problems: item.problems,
      });
      expect(board).toEqual(item.board);

      const atMax = computeScoreboard(
        [
          ...item.submissions,
          { team: item.chaser, problem: item.targetProblem, minute: maxMinute, verdict: "AC" },
        ],
        { ...scoreOpts, teams, problems: item.problems },
      );
      const chaserAtMax = atMax.find((r) => r.team === item.chaser)!;
      const rivalAtMax = atMax.find((r) => r.team === item.rival)!;
      expect(compareStandings(chaserAtMax, rivalAtMax)).toBeLessThan(0);

      // Unique latest minute: one minute later no longer strictly passes rival.
      expect(maxMinute + 1).toBeLessThanOrEqual(ICPC_MAX_MINUTE);
      const atNext = computeScoreboard(
        [
          ...item.submissions,
          {
            team: item.chaser,
            problem: item.targetProblem,
            minute: maxMinute + 1,
            verdict: "AC",
          },
        ],
        { ...scoreOpts, teams, problems: item.problems },
      );
      const chaserAtNext = atNext.find((r) => r.team === item.chaser)!;
      const rivalAtNext = atNext.find((r) => r.team === item.rival)!;
      expect(compareStandings(chaserAtNext, rivalAtNext)).toBeGreaterThanOrEqual(0);
      break;
    }

    case "escolher": {
      expect(item.problemStats.length).toBeGreaterThanOrEqual(4);
      const best = item.problemStats.find((p) => p.problem === item.canonical);
      expect(best).toBeDefined();
      for (const p of item.problemStats) {
        expect(p.attempts).toBeGreaterThanOrEqual(1);
        expect(p.ac).toBeGreaterThanOrEqual(0);
        expect(p.ac).toBeLessThanOrEqual(p.attempts);
        if (p.problem !== best!.problem) {
          // Strict unique maximum via exact cross-multiplication.
          expect(best!.ac * p.attempts).toBeGreaterThan(p.ac * best!.attempts);
        }
      }
      break;
    }
  }
}

describe("icpc drill generator properties (AC-2)", () => {
  for (const kind of ICPC_KINDS) {
    it(`kind "${kind}" satisfies all invariants and is deterministic by seed`, () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 0x7fffffff }),
          fc.integer({ min: 0, max: 40 }),
          fc.boolean(),
          (seed, index, compileErrorCounts) => {
            const opts = { kind, compileErrorCounts };
            const item = generateIcpcItem(seed, index, opts);
            expect(item.kind).toBe(kind);
            expect(item.compileErrorCounts).toBe(compileErrorCounts);
            verifyItemInvariants(item);
            expect(generateIcpcItem(seed, index, opts)).toEqual(item);
          },
        ),
      );
    });
  }

  it('kind "all" emits all four kinds across indices and stays deterministic', () => {
    const seen = new Set<IcpcKind>();
    for (let i = 0; i < 40; i += 1) {
      const item = generateIcpcItem(42, i, { kind: "all", compileErrorCounts: false });
      seen.add(item.kind);
      verifyItemInvariants(item);
    }
    expect(seen).toEqual(new Set(ICPC_KINDS));

    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 0x7fffffff }),
        fc.integer({ min: 0, max: 40 }),
        (seed, index) => {
          const a = generateIcpcItem(seed, index);
          const b = generateIcpcItem(seed, index);
          expect(a).toEqual(b);
          verifyItemInvariants(a);
        },
      ),
    );
  });
});
