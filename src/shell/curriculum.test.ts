import { describe, expect, it } from "vitest";
import { nextFadingStep, nextUncompleted, unitStatus } from "../learn/curriculum";
import { SHELL_TRANSCRIPTS } from "./cases/transcripts";
import { checkShellCommand, SHELL_COMMAND_TABLE } from "./check";
import {
  SHELL_LESSONS,
  SHELL_UNITS,
  shellCommandDescription,
  shellLessonById,
  shellLessonForCommand,
} from "./curriculum";
import { SHELL_DRILL_KINDS } from "./drill";

// T39 AC-6: 9-unit Shell curriculum reusing src/learn/, short explanations,
// 3 exercises verified by the checker, oracle transcripts, and 1-to-1 drill unlocking.

describe("shell curriculum (AC-6)", () => {
  it("has 9 units in order and unique lesson ids", () => {
    expect(SHELL_UNITS).toHaveLength(9);
    expect(SHELL_UNITS.map((u) => u.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const ids = SHELL_LESSONS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const lesson of SHELL_LESSONS) {
      expect(shellLessonById(lesson.id)).toBe(lesson);
    }
    expect(shellLessonById("non-existent")).toBeUndefined();
    expect(shellCommandDescription("non-existent")).toBeUndefined();
  });

  it("every drill kind is unlocked by exactly one lesson", () => {
    const counts = new Map<string, number>();
    for (const lesson of SHELL_LESSONS) {
      if (lesson.unlocksKind !== undefined) {
        counts.set(lesson.unlocksKind, (counts.get(lesson.unlocksKind) ?? 0) + 1);
      }
    }
    for (const kind of SHELL_DRILL_KINDS) {
      expect(counts.get(kind), `kind ${kind}`).toBe(1);
    }
    expect(counts.size).toBe(SHELL_DRILL_KINDS.length);

    // Unit 9 (Atalhos) is lesson-only.
    const unit9 = SHELL_UNITS[8]!;
    expect(
      unit9.lessons.every((l) => l.unlocksKind === undefined && l.practiceKinds.length === 0),
    ).toBe(true);

    // Every reference command links to a lesson.
    for (const entry of SHELL_COMMAND_TABLE) {
      expect(shellLessonForCommand(entry.key), `lesson for ${entry.key}`).toBeDefined();
      expect(shellCommandDescription(entry.key), `description for ${entry.key}`).toBeTruthy();
    }
  });

  it("every exercise answer passes the checker", () => {
    for (const lesson of SHELL_LESSONS) {
      expect(lesson.title.length, lesson.id).toBeGreaterThan(2);
      expect(lesson.explanation.length, lesson.id).toBeGreaterThan(20);
      const sentences = lesson.explanation
        .split(/[.!?]+(?:\s|$)/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      expect(sentences.length, `${lesson.id}: ${lesson.explanation}`).toBeLessThanOrEqual(3);

      expect(lesson.exercises, lesson.id).toHaveLength(3);
      lesson.exercises.forEach((ex, idx) => {
        const label = `${lesson.id}#${String(idx + 1)}`;
        expect(ex.prompt.length, label).toBeGreaterThan(5);
        const res = checkShellCommand(ex.canonical, ex.expected);
        expect(res.ok, `${label} canonical="${ex.canonical}"`).toBe(true);
      });
    }

    // Unit 8 credits GEMPRO Notebook per owner decision.
    const unit8Text = SHELL_UNITS[7]!.lessons
      .map((l) => `${l.explanation} ${l.note ?? ""}`)
      .join(" ");
    expect(unit8Text).toContain("GEMPRO Notebook");
  });

  it("every lesson example has an oracle transcript", () => {
    for (const lesson of SHELL_LESSONS) {
      const transcript = SHELL_TRANSCRIPTS[lesson.id];
      expect(transcript, `missing transcript for ${lesson.id}`).toBeDefined();
      if (transcript === undefined) continue;
      expect(transcript.frames.length, lesson.id).toBe(lesson.example.steps.length + 1);
      expect(transcript.frames[0]?.cmd, lesson.id).toBeNull();
      for (const frame of transcript.frames) {
        expect(frame.cwd.length, lesson.id).toBeGreaterThan(0);
        for (const out of frame.output) {
          expect(out, `${lesson.id} unmasked tmp path`).not.toContain("/tmp/popis-shell-");
        }
      }
    }
  });

  it("reuses src/learn helpers cleanly with shell units", () => {
    const u1 = SHELL_UNITS[0]!;
    expect(unitStatus(u1, new Set())).toBe("new");
    expect(unitStatus(u1, new Set([u1.lessons[0]!.id]))).toBe("in-progress");
    expect(unitStatus(u1, new Set(u1.lessons.map((l) => l.id)))).toBe("done");
    expect(nextUncompleted(SHELL_LESSONS, new Set())?.id).toBe(SHELL_LESSONS[0]?.id);
    expect(nextFadingStep(0, true)).toBe(2);
  });
});
