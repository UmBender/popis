import { describe, expect, it } from "vitest";
import type { Problem } from "../core/problem";
import type { Attempt, Outcome } from "../session/engine";
import { scoreboard, sparkline, verdicts } from "./verdicts";

// T18 AC-5 and AC-6: the judge's verdicts and the ICPC scoreboard.

function attempt(skill: string, outcome: Outcome, corrections = 0, timeMs = 1500): Attempt {
  const problem: Problem = { prompt: "1 + 1", answer: "2", skill, seed: 1, params: null };
  return { problem, outcome, corrections, timeMs };
}

describe("verdicts", () => {
  it("verdicts of an empty log with no pending correction are empty", () => {
    expect(verdicts([], 0)).toEqual([]);
  });

  it("verdicts put one WA per correction before the AC or SK of each problem", () => {
    const log = [
      attempt("a", "correct"),
      attempt("a", "correct", 2),
      attempt("a", "skipped"),
      attempt("a", "skipped", 1),
    ];
    expect(verdicts(log, 0)).toEqual(["AC", "WA", "WA", "AC", "SK", "WA", "SK"]);
  });

  it("verdicts end with the corrections of the problem on screen", () => {
    expect(verdicts([attempt("a", "correct")], 2)).toEqual(["AC", "WA", "WA"]);
  });

  it("verdicts leave out the problem the timer cut", () => {
    expect(verdicts([attempt("a", "correct"), attempt("a", "timeout", 1)], 0)).toEqual(["AC"]);
  });
});

describe("scoreboard", () => {
  const cases: readonly {
    readonly name: string;
    readonly log: readonly Attempt[];
    readonly rows: readonly { readonly skill: string; readonly cells: readonly string[] }[];
  }[] = [
    { name: "an empty log has no rows", log: [], rows: [] },
    {
      name: "a first-try answer is + with its time",
      log: [attempt("arithmetic.add", "correct", 0, 3100)],
      rows: [{ skill: "Adição", cells: ["ac + 3,10 s"] }],
    },
    {
      name: "an answer after n corrections is +n",
      log: [attempt("arithmetic.mul", "correct", 1, 8100)],
      rows: [{ skill: "Multiplicação", cells: ["ac +1 8,10 s"] }],
    },
    {
      name: "a skip without corrections is ?",
      log: [attempt("arithmetic.mul", "skipped")],
      rows: [{ skill: "Multiplicação", cells: ["sk ? pulada"] }],
    },
    {
      name: "a skip after n corrections is −n",
      log: [attempt("arithmetic.add", "skipped", 3)],
      rows: [{ skill: "Adição", cells: ["wa −3 pulada"] }],
    },
    {
      name: "the problem the timer cut is left out",
      log: [attempt("arithmetic.add", "correct"), attempt("arithmetic.add", "timeout", 2)],
      rows: [{ skill: "Adição", cells: ["ac + 1,50 s"] }],
    },
    {
      name: "rows follow the first appearance of each type, cells keep the order",
      log: [
        attempt("arithmetic.mul", "correct", 0, 1000),
        attempt("arithmetic.add", "skipped"),
        attempt("arithmetic.mul", "correct", 2, 2000),
      ],
      rows: [
        { skill: "Multiplicação", cells: ["ac + 1,00 s", "ac +2 2,00 s"] },
        { skill: "Adição", cells: ["sk ? pulada"] },
      ],
    },
  ];

  for (const { name, log, rows } of cases) {
    it(`scoreboard: ${name}`, () => {
      const board = scoreboard(log).map((row) => ({
        skill: row.skill,
        cells: row.cells.map((c) => `${c.tone} ${c.mark} ${c.note}`),
      }));
      expect(board).toEqual(rows);
    });
  }
});

describe("sparkline", () => {
  it("sparkline maps the lowest score to ▁ and the highest to █", () => {
    expect(sparkline([0, 7])).toBe("▁█");
    expect(sparkline([10, 20, 30, 40, 50, 60, 70, 80])).toBe("▁▂▃▄▅▆▇█");
  });

  it("sparkline of equal scores is a flat middle bar", () => {
    expect(sparkline([5, 5, 5])).toBe("▄▄▄");
  });

  it("sparkline of no scores is empty", () => {
    expect(sparkline([])).toBe("");
  });
});
