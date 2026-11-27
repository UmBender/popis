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
import { parseShell } from "./parse";

// T39 AC-6: 9-unit Shell curriculum reusing src/learn/, short explanations,
// 3 exercises verified by the checker, oracle transcripts, and 1-to-1 drill unlocking.

describe("shell curriculum (AC-6)", () => {
  it("has 11 units in order and unique lesson ids", () => {
    expect(SHELL_UNITS).toHaveLength(11);
    expect(SHELL_UNITS.map((u) => u.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
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
      // Units 1-9 keep the T39 limit of 3 sentences; script units 10-11 allow 4 (ADR-T54-1).
      const maxSentences =
        lesson.unitId.startsWith("u10-") || lesson.unitId.startsWith("u11-") ? 4 : 3;
      expect(sentences.length, `${lesson.id}: ${lesson.explanation}`).toBeLessThanOrEqual(
        maxSentences,
      );

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

// T54 AC-3/AC-4: units 10 (Scripts) and 11 (Controle) with annotated scripts.

const SCRIPT_UNIT_TABLE: readonly (readonly [string, readonly string[]])[] = [
  ["u10-scripts", ["u10-first", "u10-vars", "u10-math", "u10-args", "u10-exit"]],
  ["u11-controle", ["u11-if", "u11-loops", "u11-case", "u11-func", "u11-strict", "u11-prova"]],
];

function scriptLessons() {
  return SHELL_LESSONS.filter((l) => l.unitId === "u10-scripts" || l.unitId === "u11-controle");
}

describe("shell script lessons (T54 AC-3, AC-4)", () => {
  it("script lessons explain in at most 4 sentences", () => {
    for (const [unitId, lessonIds] of SCRIPT_UNIT_TABLE) {
      const unit = SHELL_UNITS.find((u) => u.id === unitId);
      expect(unit, unitId).toBeDefined();
      expect(unit?.lessons.map((l) => l.id)).toEqual(lessonIds);
    }
    expect(SHELL_UNITS[9]?.id).toBe("u10-scripts");
    expect(SHELL_UNITS[10]?.id).toBe("u11-controle");
    expect(shellLessonById("u11-prova")?.unlocksKind).toBe("scripts");

    for (const lesson of scriptLessons()) {
      const sentences = lesson.explanation
        .split(/[.!?]+(?:\s|$)/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      expect(sentences.length, lesson.id).toBeGreaterThanOrEqual(2);
      expect(sentences.length, `${lesson.id}: ${lesson.explanation}`).toBeLessThanOrEqual(4);
      for (const ex of lesson.exercises) {
        expect(ex.canonical, `${lesson.id} exercise is one line`).not.toContain("\n");
      }
    }
  });

  it("every script line has a note", () => {
    const lessons = scriptLessons();
    expect(lessons).toHaveLength(11);
    for (const lesson of lessons) {
      const scripts = lesson.example.scripts ?? [];
      expect(scripts.length, `${lesson.id} has an annotated script`).toBeGreaterThan(0);
      for (const script of scripts) {
        expect(script.file, lesson.id).toMatch(/^[a-z]+\.sh$/);
        expect(["#!/usr/bin/env bash", "#!/bin/bash"], lesson.id).toContain(script.lines[0]?.code);
        expect(script.lines.length, lesson.id).toBeGreaterThan(2);
        for (const line of script.lines) {
          expect(line.code.trim().length, `${lesson.id} ${script.file}`).toBeGreaterThan(0);
          expect(line.note.trim().length, `${lesson.id} ${line.code}`).toBeGreaterThan(3);
          expect(line.note, `${lesson.id} ${line.code}`).not.toContain("`");
        }
      }
    }
    expect(shellLessonById("u11-prova")?.example.scripts?.map((s) => s.file)).toEqual([
      "run.sh",
      "stress.sh",
    ]);
  });

  it("every script parses in the shell subset", () => {
    for (const lesson of scriptLessons()) {
      for (const script of lesson.example.scripts ?? []) {
        const res = parseShell(script.lines.map((l) => l.code).join("\n"));
        expect(res.ok, `${lesson.id} ${script.file}: ${res.ok ? "" : res.error}`).toBe(true);
      }
    }
  });
});
