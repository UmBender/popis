import { describe, expect, it } from "vitest";
import { systemClock } from "../core/clock";
import { ALL_LESSONS } from "./curriculum";
import { ALL_EDIT_KINDS, generateEdit } from "./drills/edit";
import { generateTarget } from "./drills/target";
import { pressEditKey } from "./edit";
import { pressKey } from "./engine";
import { parseKeys } from "./keys";
import { LEVELS } from "./levels";
import {
  assistedSplit,
  AUTO_EFFICIENCY_THRESHOLD,
  AUTO_WINDOW,
  commandEfficiencies,
  commandKeysOf,
  eventsToSamples,
  motionWaypoints,
  parseSolutionBlocks,
  PREVIEW_MODE_LABELS,
  PREVIEW_MODES,
  recalculateEditPreview,
  shouldShowPreview,
  STUCK_EXTRA_KEYS,
  STUCK_IDLE_MS,
  type CommandSample,
} from "./preview";
import { createState } from "./state";

const LESSON_IDS = new Set(ALL_LESSONS.map((l) => l.id));

describe("preview constants and labels (T21 AC-1)", () => {
  it("exports the four preview modes, labels and adaptive thresholds", () => {
    expect([...PREVIEW_MODES]).toEqual(["off", "always", "stuck", "auto"]);
    expect(PREVIEW_MODE_LABELS).toEqual({
      off: "Desligada",
      always: "Sempre",
      stuck: "Ao travar",
      auto: "Automática",
    });
    expect(AUTO_EFFICIENCY_THRESHOLD).toBe(0.85);
    expect(AUTO_WINDOW).toBe(20);
    expect(STUCK_EXTRA_KEYS).toBe(2);
    expect(STUCK_IDLE_MS).toBe(5000);
  });
});

describe("parseSolutionBlocks (T21 AC-2, AC-6)", () => {
  it("splits motion solutions across all levels into blocks with descriptions and T20 lessons", () => {
    for (const level of LEVELS) {
      for (let i = 0; i < 6; i++) {
        const target = generateTarget(500 + level * 10 + i, i, level);
        const blocks = parseSolutionBlocks(target.solution);
        expect(blocks.length).toBeGreaterThan(0);
        expect(blocks.flatMap((b) => b.keys)).toEqual(parseKeys(target.solution));
        let cursor = 0;
        for (const block of blocks) {
          expect(block.startKeyIndex).toBe(cursor);
          expect(block.endKeyIndex).toBe(cursor + block.keys.length);
          cursor = block.endKeyIndex;
          expect(block.description, `${target.solution} -> ${block.text}`).toBeTruthy();
          expect(block.lessonId, `${target.solution} -> ${block.text}`).toBeTruthy();
          expect(LESSON_IDS.has(block.lessonId as string)).toBe(true);
        }
      }
    }
  });

  it("splits counted motions, finds, line jumps and searches cleanly", () => {
    const blocks = parseSolutionBlocks("2wf(3G/ab<CR>");
    expect(blocks.map((b) => b.text)).toEqual(["2w", "f(", "3G", "/ab<CR>"]);
    expect(blocks.map((b) => b.helpKey)).toEqual(["w", "f{c}", "{n}G", "/"]);
    expect(blocks.map((b) => b.commandKey)).toEqual(["w", "f", "G", "/"]);
  });

  it("splits every edit kind reference into blocks preserving keys and linking command lessons", () => {
    for (const kind of ALL_EDIT_KINDS) {
      const edit = generateEdit(17, 0, [kind]);
      const blocks = parseSolutionBlocks(edit.reference);
      expect(blocks.length, kind).toBeGreaterThan(0);
      expect(blocks.flatMap((b) => b.keys), kind).toEqual(parseKeys(edit.reference));
      const withLessons = blocks.filter((b) => b.lessonId !== null);
      expect(withLessons.length, kind).toBeGreaterThan(0);
      for (const b of withLessons) {
        expect(LESSON_IDS.has(b.lessonId as string), `${kind}:${b.text}`).toBe(true);
        expect(b.description, `${kind}:${b.text}`).toBeTruthy();
      }
    }
  });

  it("splits ci(x<Esc>, visual block, registers, macros and substitution cleanly", () => {
    const ciBlocks = parseSolutionBlocks("ci(x<Esc>");
    expect(ciBlocks.map((b) => b.text)).toEqual(["ci(", "x<Esc>"]);
    expect(ciBlocks[0]?.helpKey).toBe("i(");
    expect(ciBlocks[0]?.lessonId).toBeTruthy();

    const subBlocks = parseSolutionBlocks("vi{:s/\\<lt>i\\>/j/g<CR>");
    expect(subBlocks.map((b) => b.text)).toEqual(["v", "i{", ":s/\\<lt>i\\>/j/g<CR>"]);
    expect(subBlocks[2]?.helpKey).toBe(":s");

    const regBlocks = parseSolutionBlocks('"a2yyj2"ap');
    expect(regBlocks.flatMap((b) => b.keys)).toEqual(parseKeys('"a2yyj2"ap'));
    expect(regBlocks[0]?.helpKey).toBe('"a');

    const macroBlocks = parseSolutionBlocks("qayyp<C-a>q3@a");
    expect(macroBlocks.flatMap((b) => b.keys)).toEqual(parseKeys("qayyp<C-a>q3@a"));
    expect(macroBlocks[0]?.helpKey).toBe("q");
    expect(macroBlocks.at(-1)?.helpKey).toBe("9@a");
  });
});

describe("motionWaypoints (T21 AC-2)", () => {
  it("returns intermediate cursor positions excluding current cursor and target", () => {
    const lines = ["foo bar baz qux"];
    const state = createState(lines, { line: 0, col: 0 });
    const target = { line: 0, col: 12 };
    const blocks = parseSolutionBlocks("wwfz");
    // Start col 0 -> w lands col 4 -> w lands col 8 -> fz lands col 10 (not target, test exact target).
    const exactBlocks = parseSolutionBlocks("www");
    const points = motionWaypoints(state, exactBlocks, 0, target, 2);
    expect(points).toEqual([
      { line: 0, col: 4 },
      { line: 0, col: 8 },
    ]);
    expect(points).not.toContainEqual(state.cursor);
    expect(points).not.toContainEqual(target);
    // Starting from block 1 after moving to col 4 leaves only col 8.
    const afterFirst = pressKey(state, "w", 2).state;
    expect(motionWaypoints(afterFirst, exactBlocks, 1, target, 2)).toEqual([{ line: 0, col: 8 }]);
    // Verify blocks variable used.
    expect(blocks.length).toBe(3);
  });
});

describe("shouldShowPreview and commandEfficiencies (T21 AC-1, AC-5)", () => {
  const base = {
    solution: "2wf(",
    minimum: 4,
    keysTyped: 0,
    idleMs: 0,
    peeked: false,
    history: [] as readonly CommandSample[],
  };

  it("handles off, always and Ctrl+P peek", () => {
    expect(shouldShowPreview({ ...base, mode: "off" })).toBe(false);
    expect(shouldShowPreview({ ...base, mode: "off", keysTyped: 10, idleMs: 9000 })).toBe(false);
    expect(shouldShowPreview({ ...base, mode: "off", peeked: true })).toBe(true);
    expect(shouldShowPreview({ ...base, mode: "always" })).toBe(true);
  });

  it("stuck triggers after 2 extra keys or 5 s idle", () => {
    expect(shouldShowPreview({ ...base, mode: "stuck", keysTyped: 5, idleMs: 4999 })).toBe(false);
    expect(shouldShowPreview({ ...base, mode: "stuck", keysTyped: 6, idleMs: 0 })).toBe(true);
    expect(shouldShowPreview({ ...base, mode: "stuck", keysTyped: 0, idleMs: 5000 })).toBe(true);
  });

  it("auto shows always below 85% or fewer than 20 targets per command, and fades to stuck above 85%", () => {
    // 19 targets at 100% is not yet a full 20-target window.
    const nineteen: CommandSample[] = Array.from({ length: 19 }, () => ({
      solution: "2wf(",
      efficiency: 1,
    }));
    expect(shouldShowPreview({ ...base, mode: "auto", history: nineteen })).toBe(true);

    // 20 targets for both w and f at 90% -> fades to stuck.
    const mastered: CommandSample[] = Array.from({ length: 20 }, () => ({
      solution: "2wf(",
      efficiency: 0.9,
    }));
    expect(shouldShowPreview({ ...base, mode: "auto", history: mastered })).toBe(false);
    expect(
      shouldShowPreview({ ...base, mode: "auto", history: mastered, keysTyped: 6 }),
    ).toBe(true);
    expect(shouldShowPreview({ ...base, mode: "auto", history: mastered, idleMs: 5000 })).toBe(
      true,
    );

    // Only w is mastered, f is below 85% -> still shows always.
    const wOnly: CommandSample[] = [
      ...Array.from({ length: 20 }, () => ({ solution: "w", efficiency: 1 })),
      ...Array.from({ length: 20 }, () => ({ solution: "f(", efficiency: 0.5 })),
    ];
    expect(shouldShowPreview({ ...base, mode: "auto", history: wOnly })).toBe(true);

    // Older bad targets fall outside the 20-target window.
    const recovered: CommandSample[] = [
      ...Array.from({ length: 10 }, () => ({ solution: "2wf(", efficiency: 0.2 })),
      ...Array.from({ length: 20 }, () => ({ solution: "2wf(", efficiency: 0.85 })),
    ];
    expect(shouldShowPreview({ ...base, mode: "auto", history: recovered })).toBe(false);
    expect(commandEfficiencies(recovered).get("w")?.mean).toBeCloseTo(0.85);
    expect(commandKeysOf("2wf(")).toEqual(["w", "f"]);
  });
});

describe("recalculateEditPreview (T21 AC-2, AC-3)", () => {
  it("recalculates motion to edit start when cursor moved off-path without editing the buffer", () => {
    const edit = generateEdit(21, 0, ["delete-line"]);
    let state = createState(edit.lines, edit.start);
    // Move away from the target line if possible, or horizontally.
    const moveKey = edit.start.line > 0 ? "k" : "j";
    state = pressEditKey(state, moveKey);
    const plan = recalculateEditPreview(state, edit);
    let replay = state;
    for (const key of parseKeys(plan)) replay = pressEditKey(replay, key);
    expect(replay.lines).toEqual(edit.after);
  });

  it("recovers via Esc and undo when the buffer was modified off-path", () => {
    const edit = generateEdit(21, 0, ["append-semicolon"]);
    let state = createState(edit.lines, edit.start);
    state = pressEditKey(state, "i");
    state = pressEditKey(state, "Z");
    const plan = recalculateEditPreview(state, edit);
    let replay = state;
    for (const key of parseKeys(plan)) replay = pressEditKey(replay, key);
    expect(replay.lines).toEqual(edit.after);
  });

  it("recalculateEditPreview answers in under 16 ms on the largest corpus edits", () => {
    const kinds = ["rename-variable", "comment-block", "indent-block", "change-parens"] as const;
    for (const kind of kinds) {
      const edit = generateEdit(77, 0, [kind]);
      const moved = pressEditKey(createState(edit.lines, edit.start), "G");
      let best = Infinity;
      for (let i = 0; i < 5; i++) {
        const before = systemClock.now();
        const plan = recalculateEditPreview(moved, edit);
        best = Math.min(best, systemClock.now() - before);
        expect(plan.length).toBeGreaterThan(0);
      }
      expect(best, kind).toBeLessThan(16);
    }
  });
});

describe("assistedSplit and eventsToSamples (T21 AC-1, AC-4)", () => {
  it("assistedSplit counts reached targets with and without preview", () => {
    expect(
      assistedSplit([
        { skipped: false, assisted: false },
        { skipped: false, assisted: true },
        { skipped: false },
        { skipped: true, assisted: true },
      ]),
    ).toEqual({ withPreview: 1, withoutPreview: 2, anyAssisted: true });
    expect(assistedSplit([{ skipped: false, assisted: false }])).toEqual({
      withPreview: 0,
      withoutPreview: 1,
      anyAssisted: false,
    });
  });

  it("eventsToSamples extracts per-target efficiencies for the requested Vim drill", () => {
    const samples = eventsToSamples(
      [
        {
          at: 1,
          drill: "vim.motion",
          config: "L4",
          kc: "f",
          ok: true,
          timeMs: 1000,
          extra: { seed: 1, i: 0, keys: 4, min: 2, sol: "f(", skipped: false, snippet: "s" },
        },
        {
          at: 2,
          drill: "vim.motion",
          config: "L4",
          kc: "w",
          ok: false,
          timeMs: 1000,
          extra: { seed: 1, i: 1, keys: 3, min: 1, sol: "w", skipped: true, snippet: "s" },
        },
        {
          at: 3,
          drill: "vim.edit",
          config: "edit",
          kc: "delete-line",
          ok: true,
          timeMs: 1000,
          extra: { seed: 2, i: 0, keys: 2, min: 2, sol: "dd", skipped: false, snippet: "s" },
        },
      ],
      "vim.motion",
    );
    expect(samples).toEqual([
      { solution: "f(", efficiency: 0.5 },
      { solution: "w", efficiency: 0 },
    ]);
  });
});
