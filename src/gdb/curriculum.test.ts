import { describe, expect, it } from "vitest";
import { nextFadingStep, nextUncompleted, unitStatus } from "../learn/curriculum";
import { LESSON_TRANSCRIPTS } from "./cases/transcripts";
import { checkCommand } from "./check";
import { COMMAND_TABLE } from "./commands";
import {
  GDB_LESSONS,
  GDB_UNITS,
  gdbCommandDescription,
  gdbLessonById,
  gdbLessonForCommand,
} from "./curriculum";
import { programById } from "./programs";

// T25 AC-6: ordered 9-unit GDB curriculum, every command in one lesson,
// short explanations, 3 exercises validated by the checker, and oracle transcripts.

describe("gdb curriculum (AC-6)", () => {
  it("has 9 units in order covering the full command syllabus", () => {
    expect(GDB_UNITS).toHaveLength(9);
    expect(GDB_UNITS.map((u) => u.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const ids = GDB_LESSONS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const lesson of GDB_LESSONS) {
      expect(gdbLessonById(lesson.id)).toBe(lesson);
    }
    expect(gdbLessonById("non-existent")).toBeUndefined();
    expect(gdbCommandDescription("non-existent")).toBeUndefined();
  });

  it("every command of the table appears in exactly one lesson", () => {
    const expectedKeys = COMMAND_TABLE.map((c) => c.key);
    const counts = new Map<string, number>();

    for (const lesson of GDB_LESSONS) {
      for (const key of lesson.helpKeys) {
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }

    for (const key of expectedKeys) {
      expect(counts.get(key), `helpKey ${key}`).toBe(1);
      expect(gdbLessonForCommand(key), `gdbLessonForCommand(${key})`).toBeDefined();
      expect(gdbCommandDescription(key), `gdbCommandDescription(${key})`).toBeTruthy();
    }
    expect(counts.size).toBe(expectedKeys.length);
  });

  it("every lesson has a short explanation and 3 exercises whose answers pass the checker", () => {
    for (const lesson of GDB_LESSONS) {
      expect(lesson.title.length, lesson.id).toBeGreaterThan(2);
      expect(lesson.explanation.length, lesson.id).toBeGreaterThan(20);
      expect(lesson.explanation, lesson.id).toMatch(/[ãçõáéíóú]| de | o | a /);
      const sentences = lesson.explanation
        .split(/[.!?]+(?:\s|$)/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      expect(sentences.length, `${lesson.id}: ${lesson.explanation}`).toBeLessThanOrEqual(3);

      expect(lesson.exercises, lesson.id).toHaveLength(3);
      lesson.exercises.forEach((ex, idx) => {
        const label = `${lesson.id}#${String(idx + 1)}`;
        const prog = programById(ex.programId);
        expect(prog.lines.length, label).toBeGreaterThan(0);
        const res = checkCommand(ex.canonical, ex.expected, ex.context);
        expect(res.ok, `${label} canonical "${ex.canonical}"`).toBe(true);
        expect(ex.prompt.length, label).toBeGreaterThan(5);
      });
    }
  });

  it("every lesson example has an oracle transcript", () => {
    for (const lesson of GDB_LESSONS) {
      const transcript = LESSON_TRANSCRIPTS[lesson.id];
      expect(transcript, `missing oracle transcript for ${lesson.id}`).toBeDefined();
      if (transcript === undefined) continue;
      expect(transcript.programId).toBe(lesson.example.programId);
      expect(transcript.frames.length, lesson.id).toBe(lesson.example.steps.length + 1);
      expect(transcript.frames[0]?.cmd, lesson.id).toBeNull();
      const prog = programById(transcript.programId);
      for (const frame of transcript.frames) {
        if (frame.line !== null) {
          expect(frame.line, lesson.id).toBeGreaterThanOrEqual(1);
          expect(frame.line, lesson.id).toBeLessThanOrEqual(prog.lines.length);
        }
        // Raw memory addresses must be masked as ADDR.
        for (const out of frame.output) {
          expect(out, `${lesson.id} unmasked address`).not.toMatch(/0x[0-9a-f]{6,}/i);
        }
      }
    }

    // Breakpoints set before `run` must not light up the current-line arrow.
    const breakTranscript = LESSON_TRANSCRIPTS["u2-break"];
    expect(breakTranscript?.frames[1]?.line).toBeNull();
    expect(breakTranscript?.frames[1]?.breakpoints).toEqual([11]);
    expect(breakTranscript?.frames[3]?.line).toBe(11);
  });

  it("shared curriculum helpers work with GDB units and lessons", () => {
    const u1 = GDB_UNITS[0]!;
    expect(unitStatus(u1, new Set())).toBe("new");
    expect(unitStatus(u1, new Set([u1.lessons[0]!.id]))).toBe("in-progress");
    expect(unitStatus(u1, new Set(u1.lessons.map((l) => l.id)))).toBe("done");
    expect(nextUncompleted(GDB_LESSONS, new Set())?.id).toBe(GDB_LESSONS[0]?.id);
    expect(nextFadingStep(0, true)).toBe(2);
    expect(nextFadingStep(1, true)).toBe("done");
  });
});
