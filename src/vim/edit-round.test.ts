import { describe, expect, it } from "vitest";
import { generateEdit, type EditKind } from "./drills/edit";
import {
  editEfficiency,
  editIdleMs,
  editRemainingMs,
  editRoundStats,
  isEditRoundFinished,
  markEditAssisted,
  pauseEditRound,
  pressEditRoundKey,
  resumeEditRound,
  skipEdit,
  startEditRound,
  tickEditRound,
  type EditRound,
  type EditRoundConfig,
  type EditResult,
} from "./edit-round";
import { parseKeys } from "./keys";

// AC-7: the edit round. An edit ends when the buffer equals the after, in any
// mode; efficiency is reference keys over keys used and may pass 100%.

const SEED = 11;

function config(kinds: readonly EditKind[], durationMs = 60_000): EditRoundConfig {
  return { durationMs, seed: SEED, kinds };
}

function type(round: EditRound, keys: string, start = 0, step = 100): EditRound {
  let r = round;
  let now = start;
  for (const key of parseKeys(keys)) {
    r = pressEditRoundKey(r, key, now);
    now += step;
  }
  return r;
}

function result(over: Partial<EditResult> = {}): EditResult {
  return {
    index: 0,
    seed: 1,
    kind: "delete-line",
    snippetId: "x",
    keys: 2,
    referenceKeys: 2,
    reference: "dd",
    timeMs: 1000,
    skipped: false,
    ...over,
  };
}

describe("edit round", () => {
  it("starts with the first edit of the seed and a clock that waits for the first key", () => {
    const round = startEditRound(config(["delete-line"]));
    expect(round.target).toEqual(generateEdit(SEED, 0, ["delete-line"]));
    expect(round.startedAt).toBeNull();
    expect(editRemainingMs(round, 5_000)).toBe(60_000);
    expect(round.vim.cursor).toEqual(round.target.start);
  });

  it("typing the reference finishes the edit and shows the next one", () => {
    const round = startEditRound(config(["delete-line"]));
    const first = round.target;
    const next = type(round, first.reference, 1000);
    expect(next.results).toHaveLength(1);
    expect(next.results[0]).toMatchObject({
      index: 0,
      kind: "delete-line",
      keys: first.referenceKeys,
      referenceKeys: first.referenceKeys,
      reference: first.reference,
      skipped: false,
    });
    expect(next.target.index).toBe(1);
    expect(next.keys).toBe(0);
    expect(next.last).toBe(next.results[0]);
    expect(editEfficiency(next.results[0] as EditResult)).toBe(1);
  });

  it("an edit ends when the buffer equals the after even in insert mode", () => {
    const round = startEditRound(config(["append-semicolon"]));
    const { reference } = round.target;
    expect(reference.endsWith("<Esc>")).toBe(true);
    const keys = parseKeys(reference);
    const done = type(round, keys.slice(0, -1).join(""), 0);
    expect(done.results).toHaveLength(1);
    expect(done.results[0]?.keys).toBe(keys.length - 1);
    expect(editEfficiency(done.results[0] as EditResult)).toBeGreaterThan(1);
  });

  it("the Esc that closes an insertion belongs to the edit just finished", () => {
    const round = startEditRound(config(["append-semicolon"]));
    const keys = parseKeys(round.target.reference);
    const done = type(round, keys.slice(0, -1).join(""), 0);
    const closed = pressEditRoundKey(done, "<Esc>", 500);
    expect(closed.results[0]?.keys).toBe(keys.length);
    expect(editEfficiency(closed.results[0] as EditResult)).toBe(1);
    expect(closed.keys).toBe(0);
    expect(closed.target.index).toBe(1);
    // Only the first key after the edit is taken that way.
    const again = pressEditRoundKey(closed, "<Esc>", 600);
    expect(again.keys).toBe(1);
  });

  it("keys typed on an edit count, blocked or not, until it is done", () => {
    const round = startEditRound(config(["delete-line"]));
    const typed = type(round, "jk<Esc>");
    expect(typed.keys).toBe(3);
    expect(typed.results).toHaveLength(0);
  });

  it("Ctrl+Enter skips the edit, which counts as skipped", () => {
    const round = startEditRound(config(["delete-line"]));
    const skipped = skipEdit(round, 2000);
    expect(skipped.results[0]?.skipped).toBe(true);
    expect(skipped.target.index).toBe(1);
    expect(editEfficiency(skipped.results[0] as EditResult)).toBe(0);
  });

  it("the clock starts on the first key and the round ends when the time is up", () => {
    const round = startEditRound(config(["delete-line"], 30_000));
    const started = pressEditRoundKey(round, "j", 1000);
    expect(started.startedAt).toBe(1000);
    expect(editRemainingMs(started, 11_000)).toBe(20_000);
    expect(isEditRoundFinished(tickEditRound(started, 30_999))).toBe(false);
    const over = tickEditRound(started, 31_000);
    expect(isEditRoundFinished(over)).toBe(true);
    expect(editRemainingMs(over, 40_000)).toBe(0);
    expect(pressEditRoundKey(over, "j", 32_000)).toBe(over);
    expect(isEditRoundFinished(pressEditRoundKey(started, "j", 31_000))).toBe(true);
  });

  it("efficiency is the reference keys over the keys used, with no ceiling", () => {
    expect(editEfficiency(result({ keys: 4, referenceKeys: 2 }))).toBe(0.5);
    expect(editEfficiency(result({ keys: 2, referenceKeys: 3 }))).toBe(1.5);
    expect(editEfficiency(result({ keys: 0 }))).toBe(0);
    expect(editEfficiency(result({ skipped: true }))).toBe(0);
  });

  it("the stats average the reached edits and list the worst three", () => {
    const stats = editRoundStats({
      results: [
        result({ index: 0, keys: 2, referenceKeys: 2 }),
        result({ index: 1, keys: 4, referenceKeys: 2 }),
        result({ index: 2, keys: 1, referenceKeys: 2 }),
        result({ index: 3, skipped: true }),
        result({ index: 4, keys: 8, referenceKeys: 2 }),
      ],
    });
    expect(stats.reached).toBe(4);
    expect(stats.skipped).toBe(1);
    expect(stats.efficiency).toBeCloseTo((1 + 0.5 + 2 + 0.25) / 4);
    expect(stats.worst.map((r) => r.index)).toEqual([4, 1, 0]);
  });

  it("a finished round ignores skips, and a skip after the time is up ends the round", () => {
    const round = startEditRound(config(["delete-line"], 30_000));
    const started = pressEditRoundKey(round, "j", 1000);
    const over = tickEditRound(started, 31_000);
    expect(skipEdit(over, 32_000)).toBe(over);
    expect(isEditRoundFinished(skipEdit(started, 31_000))).toBe(true);
  });

  it("the stats of a round without reached edits are zero", () => {
    expect(editRoundStats({ results: [] })).toEqual({
      reached: 0,
      skipped: 0,
      efficiency: 0,
      worst: [],
    });
    expect(editRoundStats({ results: [result({ skipped: true })] }).efficiency).toBe(0);
  });

  it("the same config plays the same round", () => {
    const keys = (r: EditRound) => type(r, r.target.reference, 0).results;
    expect(keys(startEditRound(config(["delete-word", "change-word"])))).toEqual(
      keys(startEditRound(config(["delete-word", "change-word"]))),
    );
  });

  it("markEditAssisted flags the current edit and resets on the next (T21 AC-4)", () => {
    let round = startEditRound(config(["delete-line"]));
    expect(round.assisted).toBe(false);
    round = markEditAssisted(round);
    expect(round.assisted).toBe(true);
    round = type(round, round.target.reference, 1000);
    expect(round.results[0]?.assisted).toBe(true);
    expect(round.assisted).toBe(false);
    round = type(round, round.target.reference, 2000);
    expect(round.results[1]?.assisted).toBe(false);
  });

  it("pauseEditRound and resumeEditRound freeze time and block input while paused (T21 AC-6)", () => {
    let round = pressEditRoundKey(startEditRound(config(["delete-line"], 30_000)), "j", 1000);
    expect(editRemainingMs(round, 6000)).toBe(25_000);
    round = pauseEditRound(round, 6000);
    expect(round.pausedAt).toBe(6000);
    expect(editRemainingMs(round, 40_000)).toBe(25_000);
    expect(editIdleMs(round, 40_000)).toBe(5000);
    expect(tickEditRound(round, 50_000)).toBe(round);
    expect(pressEditRoundKey(round, "d", 15_000)).toBe(round);
    expect(skipEdit(round, 15_000)).toBe(round);

    round = resumeEditRound(round, 20_000);
    expect(round.pausedAt).toBeNull();
    expect(editRemainingMs(round, 20_000)).toBe(25_000);
    expect(editRemainingMs(round, 25_000)).toBe(20_000);
  });
});
