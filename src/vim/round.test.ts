import { describe, expect, it } from "vitest";
import { parseKeys } from "./keys";
import {
  isRoundFinished,
  pressRoundKey,
  remainingMs,
  roundStats,
  ROUND_DURATIONS_S,
  skipTarget,
  startRound,
  targetEfficiency,
  tickRound,
  type Round,
  type RoundConfig,
  type TargetResult,
} from "./round";

// AC-7: the clock starts on the first key; reaching a target shows the next
// one at once; each target keeps keys, minimum and time.

const CONFIG: RoundConfig = { level: 4, durationMs: 30_000, seed: 12345 };

function typeKeys(round: Round, keys: string, now: number): Round {
  let r = round;
  for (const key of parseKeys(keys)) r = pressRoundKey(r, key, now);
  return r;
}

const result = (keys: number, minimum: number, skipped = false): TargetResult => ({
  index: 0,
  seed: 1,
  snippetId: "x",
  keys,
  minimum,
  solution: "w",
  timeMs: 100,
  skipped,
});

describe("round", () => {
  it("ROUND_DURATIONS_S offers 30, 60 and 120 seconds", () => {
    expect([...ROUND_DURATIONS_S]).toEqual([30, 60, 120]);
  });

  it("startRound shows the first target and does not start the clock", () => {
    const round = startRound(CONFIG);
    expect(round.target.index).toBe(0);
    expect(round.startedAt).toBeNull();
    expect(round.results).toEqual([]);
    expect(isRoundFinished(round)).toBe(false);
    expect(remainingMs(round, 5000)).toBe(30_000);
  });

  it("the clock starts on the first key", () => {
    const round = pressRoundKey(startRound(CONFIG), "<Esc>", 4000);
    expect(round.startedAt).toBe(4000);
    expect(remainingMs(round, 14_000)).toBe(20_000);
  });

  it("tickRound does nothing before the first key", () => {
    const round = startRound(CONFIG);
    expect(tickRound(round, 999_999)).toBe(round);
  });

  it("reaching the target records it and shows the next one at once", () => {
    const first = startRound(CONFIG);
    const solution = first.target.solution;
    const after = typeKeys(first, solution, 1000);
    expect(after.results).toHaveLength(1);
    expect(after.results[0]).toMatchObject({
      index: 0,
      keys: parseKeys(solution).length,
      minimum: first.target.minimum,
      skipped: false,
    });
    expect(after.target.index).toBe(1);
    expect(after.last).toBe(after.results[0]);
    expect(after.vim.cursor).toEqual(after.target.start);
    expect(after.keys).toBe(0);
  });

  it("the time of a target runs from when it appeared to when it was reached", () => {
    let round = pressRoundKey(startRound(CONFIG), "<Esc>", 1000);
    round = typeKeys(round, round.target.solution, 3000);
    expect(round.results[0]?.timeMs).toBe(2000);
    round = typeKeys(round, round.target.solution, 7500);
    expect(round.results[1]?.timeMs).toBe(4500);
  });

  it("every key counts, including blocked ones", () => {
    let round = startRound({ ...CONFIG, level: 1 });
    round = pressRoundKey(round, "w", 0);
    expect(round.blocked).toBe("w");
    expect(round.keys).toBe(1);
    round = pressRoundKey(round, "x", 0);
    expect(round.blocked).toBeNull();
    expect(round.keys).toBe(2);
    const solved = typeKeys(round, round.target.solution, 10);
    expect(solved.results[0]?.keys).toBe(2 + parseKeys(round.target.solution).length);
  });

  it("a longer path lowers the efficiency", () => {
    let round = startRound({ ...CONFIG, level: 1 });
    round = typeKeys(round, "hl", 0);
    const solved = typeKeys(round, round.target.solution, 10);
    const done = solved.results[0];
    expect(done).toBeDefined();
    expect(targetEfficiency(done as TargetResult)).toBeCloseTo(
      (done as TargetResult).minimum / (done as TargetResult).keys,
    );
  });

  it("skipTarget counts the target as skipped and shows the next one", () => {
    let round = typeKeys(startRound(CONFIG), "ww", 1000);
    round = skipTarget(round, 2500);
    expect(round.results).toHaveLength(1);
    expect(round.results[0]).toMatchObject({ skipped: true, keys: 2, timeMs: 1500 });
    expect(round.target.index).toBe(1);
    expect(round.keys).toBe(0);
  });

  it("skipTarget starts the clock when it is the first action", () => {
    const round = skipTarget(startRound(CONFIG), 700);
    expect(round.startedAt).toBe(700);
  });

  it("the round finishes when the time is up and then ignores keys", () => {
    let round = pressRoundKey(startRound(CONFIG), "<Esc>", 0);
    round = tickRound(round, 29_999);
    expect(isRoundFinished(round)).toBe(false);
    round = tickRound(round, 30_000);
    expect(isRoundFinished(round)).toBe(true);
    expect(remainingMs(round, 99_000)).toBe(0);
    expect(pressRoundKey(round, "l", 31_000)).toBe(round);
    expect(skipTarget(round, 31_000)).toBe(round);
    expect(tickRound(round, 40_000)).toBe(round);
  });

  it("a key after the time is up finishes the round and does not count", () => {
    const round = pressRoundKey(startRound(CONFIG), "<Esc>", 0);
    const late = pressRoundKey(round, "l", 30_500);
    expect(isRoundFinished(late)).toBe(true);
    expect(late.results).toEqual([]);
    expect(skipTarget(round, 30_500).results).toEqual([]);
    expect(isRoundFinished(skipTarget(round, 30_500))).toBe(true);
  });

  it("the same seed gives the same targets in the same order", () => {
    const a = startRound(CONFIG);
    const b = startRound(CONFIG);
    expect(a.target).toEqual(b.target);
    const next = (r: Round) => typeKeys(r, r.target.solution, 0).target;
    expect(next(a)).toEqual(next(b));
  });
});

describe("roundStats", () => {
  it("roundStats counts reached and skipped targets", () => {
    const round = { results: [result(2, 2), result(4, 2, true), result(3, 3)] } as Round;
    const stats = roundStats(round);
    expect(stats.reached).toBe(2);
    expect(stats.skipped).toBe(1);
  });

  it("roundStats averages the efficiency of the reached targets", () => {
    const round = { results: [result(2, 2), result(4, 2), result(9, 1, true)] } as Round;
    expect(roundStats(round).efficiency).toBeCloseTo(0.75);
  });

  it("roundStats gives zero efficiency when nothing was reached", () => {
    expect(roundStats({ results: [] } as unknown as Round).efficiency).toBe(0);
    expect(roundStats({ results: [result(1, 1, true)] } as Round).efficiency).toBe(0);
  });

  it("roundStats lists the 3 reached targets with the worst efficiency first", () => {
    const results = [result(2, 2), result(8, 2), result(4, 2), result(6, 2), result(5, 2, true)];
    const worst = roundStats({ results } as Round).worst;
    expect(worst.map((r) => r.keys)).toEqual([8, 6, 4]);
  });

  it("targetEfficiency is the minimum over the keys used, at most 1", () => {
    expect(targetEfficiency(result(4, 2))).toBe(0.5);
    expect(targetEfficiency(result(2, 2))).toBe(1);
    expect(targetEfficiency(result(1, 3))).toBe(1);
    expect(targetEfficiency(result(0, 3, true))).toBe(0);
  });
});
