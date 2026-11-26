import { describe, expect, it } from "vitest";
import { compareStandings, computeScoreboard, type Submission } from "./score";

// T43 AC-1: pure ICPC / Maratona SBC scoreboard rules.

describe("computeScoreboard (AC-1)", () => {
  it("computes solved count and penalty with 20 min per rejected submission before AC", () => {
    const log: Submission[] = [
      { team: "Alfa", problem: "A", minute: 10, verdict: "WA" },
      { team: "Alfa", problem: "A", minute: 25, verdict: "AC" },
      { team: "Alfa", problem: "B", minute: 40, verdict: "TLE" },
      { team: "Alfa", problem: "B", minute: 50, verdict: "RTE" },
      { team: "Alfa", problem: "B", minute: 65, verdict: "AC" },
      // Unsolved problem C: rejections must not add penalty.
      { team: "Alfa", problem: "C", minute: 70, verdict: "WA" },
      { team: "Alfa", problem: "C", minute: 80, verdict: "MLE" },
    ];

    const [alfa] = computeScoreboard(log);
    expect(alfa).toBeDefined();
    expect(alfa?.rank).toBe(1);
    expect(alfa?.solved).toBe(2);
    // A: 25 + 20*1 = 45; B: 65 + 20*2 = 105; C: 0 -> total 150.
    expect(alfa?.penalty).toBe(150);
    expect(alfa?.lastAcMinute).toBe(65);
    expect(alfa?.problems["A"]).toEqual({
      problem: "A",
      solved: true,
      acMinute: 25,
      rejected: 1,
      compileErrors: 0,
      afterAc: 0,
      attempts: 2,
      penalty: 45,
    });
    expect(alfa?.problems["C"]).toEqual({
      problem: "C",
      solved: false,
      acMinute: null,
      rejected: 2,
      compileErrors: 0,
      afterAc: 0,
      attempts: 2,
      penalty: 0,
    });
  });

  it("ignores rejected submissions and extra ACs after the first AC", () => {
    const log: Submission[] = [
      { team: "Beta", problem: "A", minute: 20, verdict: "AC" },
      { team: "Beta", problem: "A", minute: 35, verdict: "WA" },
      { team: "Beta", problem: "A", minute: 50, verdict: "TLE" },
      { team: "Beta", problem: "A", minute: 120, verdict: "AC" },
    ];

    const [beta] = computeScoreboard(log);
    expect(beta?.solved).toBe(1);
    expect(beta?.penalty).toBe(20);
    expect(beta?.lastAcMinute).toBe(20);
    expect(beta?.problems["A"]?.rejected).toBe(0);
    expect(beta?.problems["A"]?.afterAc).toBe(3);
    expect(beta?.problems["A"]?.attempts).toBe(1);
  });

  it("does not penalize CE by default (WF rule) and penalizes it when configured", () => {
    const log: Submission[] = [
      { team: "Gama", problem: "A", minute: 12, verdict: "CE" },
      { team: "Gama", problem: "A", minute: 18, verdict: "WA" },
      { team: "Gama", problem: "A", minute: 30, verdict: "AC" },
      { team: "Gama", problem: "B", minute: 45, verdict: "CE" },
    ];

    const [wf] = computeScoreboard(log);
    expect(wf?.penalty).toBe(50);
    expect(wf?.problems["A"]?.rejected).toBe(1);
    expect(wf?.problems["A"]?.compileErrors).toBe(1);
    expect(wf?.problems["A"]?.attempts).toBe(2);
    expect(wf?.problems["B"]?.rejected).toBe(0);
    expect(wf?.problems["B"]?.compileErrors).toBe(1);
    expect(wf?.problems["B"]?.attempts).toBe(0);

    const [withCe] = computeScoreboard(log, { compileErrorCounts: true });
    expect(withCe?.penalty).toBe(70);
    expect(withCe?.problems["A"]?.rejected).toBe(2);
    expect(withCe?.problems["A"]?.compileErrors).toBe(1);
    expect(withCe?.problems["A"]?.attempts).toBe(3);
    expect(withCe?.problems["B"]?.rejected).toBe(1);
    expect(withCe?.problems["B"]?.attempts).toBe(1);
  });

  it("counts same-minute rejection before AC independently of log order", () => {
    const aFirst: Submission[] = [
      { team: "Delta", problem: "A", minute: 40, verdict: "AC" },
      { team: "Delta", problem: "A", minute: 40, verdict: "WA" },
    ];
    const wFirst: Submission[] = [
      { team: "Delta", problem: "A", minute: 40, verdict: "WA" },
      { team: "Delta", problem: "A", minute: 40, verdict: "AC" },
    ];

    const resA = computeScoreboard(aFirst);
    const resW = computeScoreboard(wFirst);
    expect(resA).toEqual(resW);
    expect(resA[0]?.penalty).toBe(60);
    expect(resA[0]?.problems["A"]?.rejected).toBe(1);
  });

  it("orders by solved desc, penalty asc, lastAcMinute asc, and shares rank on exact ties", () => {
    const log: Submission[] = [
      // Team Top: 3 solved, penalty 300
      { team: "Top", problem: "A", minute: 50, verdict: "AC" },
      { team: "Top", problem: "B", minute: 100, verdict: "AC" },
      { team: "Top", problem: "C", minute: 150, verdict: "AC" },
      // Team EarlyLast: 2 solved, penalty 140, lastAc 80 (40 + 20 + 80 = 140)
      { team: "EarlyLast", problem: "A", minute: 20, verdict: "WA" },
      { team: "EarlyLast", problem: "A", minute: 40, verdict: "AC" },
      { team: "EarlyLast", problem: "B", minute: 80, verdict: "AC" },
      // Team LateLast: 2 solved, penalty 140, lastAc 100 (40 + 100 = 140)
      { team: "LateLast", problem: "A", minute: 40, verdict: "AC" },
      { team: "LateLast", problem: "B", minute: 100, verdict: "AC" },
      // Team TieB and Team TieA: exact tie at 1 solved, penalty 50, lastAc 50
      { team: "TieB", problem: "A", minute: 50, verdict: "AC" },
      { team: "TieA", problem: "B", minute: 50, verdict: "AC" },
      // Team Zero: 0 solved
      { team: "Zero", problem: "A", minute: 30, verdict: "WA" },
    ];

    const board = computeScoreboard(log);
    expect(board.map((r) => [r.rank, r.team, r.solved, r.penalty, r.lastAcMinute])).toEqual([
      [1, "Top", 3, 300, 150],
      [2, "EarlyLast", 2, 140, 80],
      [3, "LateLast", 2, 140, 100],
      [4, "TieA", 1, 50, 50],
      [4, "TieB", 1, 50, 50],
      [6, "Zero", 0, 0, null],
    ]);
  });

  it("supports custom penaltyPerReject, explicit teams/problems and empty logs", () => {
    expect(computeScoreboard([])).toEqual([]);

    const board = computeScoreboard(
      [
        { team: "U1", problem: "A", minute: 10, verdict: "PE" },
        { team: "U1", problem: "A", minute: 20, verdict: "AC" },
      ],
      {
        penaltyPerReject: 10,
        teams: ["U2", "U1", "U2"],
        problems: ["A", "B"],
      },
    );

    expect(board).toHaveLength(2);
    expect(board[0]?.team).toBe("U1");
    expect(board[0]?.penalty).toBe(30);
    expect(board[0]?.problems["B"]).toEqual({
      problem: "B",
      solved: false,
      acMinute: null,
      rejected: 0,
      compileErrors: 0,
      afterAc: 0,
      attempts: 0,
      penalty: 0,
    });
    expect(board[1]?.team).toBe("U2");
    expect(board[1]?.solved).toBe(0);
    expect(board[1]?.lastAcMinute).toBeNull();
  });

  it("compareStandings handles zero-solved ties and ordered comparisons", () => {
    expect(
      compareStandings(
        { solved: 0, penalty: 0, lastAcMinute: null },
        { solved: 0, penalty: 0, lastAcMinute: null },
      ),
    ).toBe(0);
    expect(
      compareStandings(
        { solved: 2, penalty: 100, lastAcMinute: 60 },
        { solved: 1, penalty: 10, lastAcMinute: 10 },
      ),
    ).toBeLessThan(0);
    expect(
      compareStandings(
        { solved: 2, penalty: 120, lastAcMinute: 60 },
        { solved: 2, penalty: 100, lastAcMinute: 90 },
      ),
    ).toBeGreaterThan(0);
    expect(
      compareStandings(
        { solved: 2, penalty: 100, lastAcMinute: 55 },
        { solved: 2, penalty: 100, lastAcMinute: 70 },
      ),
    ).toBeLessThan(0);
  });
});
