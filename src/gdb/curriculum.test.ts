import { describe, expect, it } from "vitest";
import { nextFadingStep, nextUncompleted, unitStatus } from "../learn/curriculum";
import { LESSON_TRANSCRIPTS } from "./cases/transcripts";
import { checkCommand } from "./check";
import { checkOutput } from "./check-output";
import { COMMAND_TABLE } from "./commands";
import {
  GDB_LESSONS,
  GDB_UNITS,
  OUTPUT_FORMAT_TABLE,
  gdbCommandDescription,
  gdbLessonById,
  gdbLessonForCommand,
  gdbLessonForOutputKey,
  isOutputLesson,
} from "./curriculum";
import { programById } from "./programs";

// T25 AC-6 & T26 AC-8: ordered 14-unit GDB curriculum (units 1-9 commands, units 10-14 output),
// short explanations, 3 exercises validated by their checker, and oracle transcripts.

describe("gdb curriculum (AC-6, T26 AC-8)", () => {
  it("has 14 units in order covering commands (1-9) and output/memory (10-14)", () => {
    expect(GDB_UNITS).toHaveLength(14);
    expect(GDB_UNITS.map((u) => u.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
    const ids = GDB_LESSONS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const lesson of GDB_LESSONS) {
      expect(gdbLessonById(lesson.id)).toBe(lesson);
    }
    expect(gdbLessonById("non-existent")).toBeUndefined();
    expect(gdbCommandDescription("non-existent")).toBeUndefined();
    expect(gdbLessonForOutputKey("non-existent")).toBeUndefined();
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
        if (ex.mode === "output") {
          const res = checkOutput(ex.canonical, ex.canonical, { kind: ex.commandKind });
          expect(res.ok, `${label} output canonical "${ex.canonical}"`).toBe(true);
        } else {
          const res = checkCommand(ex.canonical, ex.expected, ex.context);
          expect(res.ok, `${label} canonical "${ex.canonical}"`).toBe(true);
        }
        expect(ex.prompt.length, label).toBeGreaterThan(5);
      });
    }
  });

  it("output lessons have examples checked by the oracle and exercises whose answers pass the output checker", () => {
    const outputUnits = GDB_UNITS.filter((u) => u.number >= 10);
    expect(outputUnits.map((u) => u.number)).toEqual([10, 11, 12, 13, 14]);
    const outputLessons = outputUnits.flatMap((u) => u.lessons);
    expect(outputLessons.length).toBeGreaterThanOrEqual(12);

    const unlockedKinds = new Set<string>();
    for (const lesson of outputLessons) {
      expect(isOutputLesson(lesson), lesson.id).toBe(true);
      expect(lesson.explanation, `${lesson.id} backticks`).not.toContain("`");
      expect(LESSON_TRANSCRIPTS[lesson.id], `transcript ${lesson.id}`).toBeDefined();
      for (const k of lesson.practiceOutputKinds ?? []) unlockedKinds.add(k);

      for (const ex of lesson.exercises) {
        expect(ex.mode, lesson.id).toBe("output");
        if (ex.mode === "output") {
          expect(ex.command.length, lesson.id).toBeGreaterThan(1);
          expect(ex.reason.length, lesson.id).toBeGreaterThan(5);
          expect(checkOutput(ex.canonical, ex.canonical, { kind: ex.commandKind }).ok).toBe(true);
        }
      }
    }

    for (const kind of [
      "formato",
      "char",
      "expressao",
      "array",
      "string",
      "struct",
      "ponteiro",
      "sizeof",
      "memoria",
    ]) {
      expect(unlockedKinds.has(kind), `output kind ${kind}`).toBe(true);
    }

    for (const entry of OUTPUT_FORMAT_TABLE) {
      expect(gdbLessonForOutputKey(entry.key), `output ref ${entry.key}`).toBeDefined();
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
        // Raw x86-64 memory addresses must be masked as ADDR (while hex integer values like 0xffffffff stay intact).
        for (const out of frame.output) {
          expect(out, `${lesson.id} unmasked address`).not.toMatch(
            /\b0x(?:0{4,}(?:40|7f|5[56])|7f[0-9a-f]{8}|5[56][0-9a-f]{8}|40[0-9a-f]{4})/i,
          );
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
