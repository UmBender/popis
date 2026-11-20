import { describe, expect, it } from "vitest";
import type { Attempt } from "../session/engine";
import type { EditResult } from "../vim/edit-round";
import type { TargetResult } from "../vim/round";
import { editEvents, mainCommand, motionEvents, sessionEvents } from "./derive";
import { eventKey } from "./event";

const problem = (skill: string, seed: number) => ({
  skill,
  prompt: "1 + 1",
  answer: "2",
  seed,
  params: null,
});

describe("sessionEvents", () => {
  it("calc events use the problem skill as kc", () => {
    const log: Attempt[] = [
      { problem: problem("arithmetic.add", 11), outcome: "correct", timeMs: 900, corrections: 1 },
      { problem: problem("arithmetic.mul", 12), outcome: "correct", timeMs: 1500, corrections: 0 },
    ];

    const events = sessionEvents({ mode: "arithmetic", finishedAt: 5000, log });

    expect(events).toEqual([
      {
        at: 5000,
        drill: "calc",
        config: "arithmetic",
        kc: "arithmetic.add",
        ok: true,
        timeMs: 900,
        extra: { seed: 11, i: 0, outcome: "correct", corrections: 1 },
      },
      {
        at: 5000,
        drill: "calc",
        config: "arithmetic",
        kc: "arithmetic.mul",
        ok: true,
        timeMs: 1500,
        extra: { seed: 12, i: 1, outcome: "correct", corrections: 0 },
      },
    ]);
  });

  it("skipped and timed out attempts are not ok", () => {
    const log: Attempt[] = [
      { problem: problem("a.b", 1), outcome: "skipped", timeMs: 100, corrections: 0 },
      { problem: problem("a.b", 2), outcome: "timeout", timeMs: 200, corrections: 2 },
    ];

    const events = sessionEvents({ mode: "factoring", finishedAt: 1, log });

    expect(events.map((e) => e.ok)).toEqual([false, false]);
    expect(events.map((e) => e.extra["outcome"])).toEqual(["skipped", "timeout"]);
  });

  it("every event of a session has its own key", () => {
    const log: Attempt[] = [1, 2, 3].map((seed) => ({
      problem: problem("a.b", seed),
      outcome: "correct",
      timeMs: 10,
      corrections: 0,
    }));

    const keys = sessionEvents({ mode: "arithmetic", finishedAt: 9, log }).map(eventKey);

    expect(new Set(keys).size).toBe(3);
  });
});

describe("motionEvents", () => {
  const target = (patch: Partial<TargetResult>): TargetResult => ({
    index: 0,
    seed: 21,
    snippetId: "cpp-1",
    keys: 3,
    minimum: 2,
    solution: "fx;",
    timeMs: 4000,
    skipped: false,
    ...patch,
  });

  it("vim motion events carry keys, minimum and solution", () => {
    const round = {
      config: { level: 2 as const, durationMs: 60_000, seed: 7 },
      results: [target({}), target({ index: 1, seed: 22, solution: "3w", skipped: true })],
    };

    const events = motionEvents(round, 8000);

    expect(events).toEqual([
      {
        at: 8000,
        drill: "vim.motion",
        config: "L2",
        kc: "f",
        ok: true,
        timeMs: 4000,
        extra: { seed: 21, i: 0, keys: 3, min: 2, sol: "fx;", skipped: false, snippet: "cpp-1" },
      },
      {
        at: 8000,
        drill: "vim.motion",
        config: "L2",
        kc: "w",
        ok: false,
        timeMs: 4000,
        extra: { seed: 22, i: 1, keys: 3, min: 2, sol: "3w", skipped: true, snippet: "cpp-1" },
      },
    ]);
  });
});

describe("editEvents", () => {
  it("vim edit events use the edit kind as kc", () => {
    const result: EditResult = {
      index: 3,
      seed: 31,
      kind: "delete-word",
      snippetId: "py-2",
      keys: 4,
      referenceKeys: 2,
      reference: "dd",
      timeMs: 2500,
      skipped: false,
    };

    const events = editEvents({ results: [result] }, 9000);

    expect(events).toEqual([
      {
        at: 9000,
        drill: "vim.edit",
        config: "edit",
        kc: "delete-word",
        ok: true,
        timeMs: 2500,
        extra: { seed: 31, i: 3, keys: 4, min: 2, sol: "dd", skipped: false, snippet: "py-2" },
      },
    ]);
  });
});

describe("mainCommand", () => {
  it("main command skips counts and registers", () => {
    expect(mainCommand("fx;")).toBe("f");
    expect(mainCommand("3w")).toBe("w");
    expect(mainCommand("12j")).toBe("j");
    expect(mainCommand('"ayy')).toBe("y");
    expect(mainCommand('"a3dd')).toBe("d");
    expect(mainCommand("/foo<CR>")).toBe("/");
    expect(mainCommand("<C-d>")).toBe("<C-d>");
    expect(mainCommand("3<C-d>")).toBe("<C-d>");
    expect(mainCommand(":s/a/b/<CR>")).toBe(":");
  });

  it("main command of nothing is empty", () => {
    expect(mainCommand("")).toBe("");
    expect(mainCommand("12")).toBe("");
    expect(mainCommand('"')).toBe("");
  });
});
