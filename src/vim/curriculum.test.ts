import { describe, expect, it } from "vitest";
import { CURRICULUM_EDIT_CASES, CURRICULUM_MOTION_CASES } from "./cases";
import { REGISTER_KINDS } from "./drills/register-edit";
import { pressEditKey } from "./edit";
import { EDIT_HELP } from "./edit-help";
import { pressKey } from "./engine";
import { parseKeys } from "./keys";
import { LESSONS } from "./lessons";
import { levelHelp } from "./levels";
import { createState } from "./state";
import {
  ALL_LESSONS,
  UNITS,
  commandDescription,
  curriculumExampleFrames,
  curriculumLessonById,
  lessonForHelpKey,
  nextExerciseStep,
  nextUncompletedLesson,
  unitStatus,
} from "./curriculum";

// T20 AC-1..AC-4: ordered 15-unit curriculum, oracle-backed examples,
// 3-step adaptive fading exercises, and unit progress helpers.

describe("curriculum structure (AC-1)", () => {
  it("has 15 units in order with units 1 to 7 matching motion levels 1 to 7", () => {
    expect(UNITS).toHaveLength(15);
    expect(UNITS.map((u) => u.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
    expect(UNITS.slice(0, 7).map((u) => u.level)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("every command of levelHelp and EDIT_HELP appears in exactly one lesson", () => {
    const motionKeys = levelHelp(7).map((h) => h.keys);
    const editKeys = EDIT_HELP.map((h) => h.keys);
    const allExpected = [...motionKeys, ...editKeys];
    const counts = new Map<string, number>();

    for (const lesson of ALL_LESSONS) {
      for (const key of lesson.helpKeys) {
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }

    for (const key of allExpected) {
      expect(counts.get(key), `helpKey ${key}`).toBe(1);
      expect(lessonForHelpKey(key), `lessonForHelpKey(${key})`).toBeDefined();
      expect(commandDescription(key), `commandDescription(${key})`).toBeTruthy();
    }
    expect(counts.size).toBe(allExpected.length);
  });

  it("units 14 and 15 keep all 8 T16 register and macro lessons", () => {
    const u14 = UNITS[13];
    const u15 = UNITS[14];
    expect(u14?.lessons).toHaveLength(4);
    expect(u15?.lessons).toHaveLength(4);
    const ids = [...(u14?.lessons ?? []), ...(u15?.lessons ?? [])].map((l) => l.id);
    expect(new Set(ids)).toEqual(new Set(REGISTER_KINDS));
    for (const old of LESSONS) {
      const found = curriculumLessonById(old.kind);
      expect(found?.title).toBe(old.title);
      expect(found?.explanation).toBe(old.explanation);
    }
  });

  it("every lesson id is unique and lookup works", () => {
    const ids = ALL_LESSONS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const lesson of ALL_LESSONS) {
      expect(curriculumLessonById(lesson.id)).toBe(lesson);
    }
    expect(curriculumLessonById("non-existent-lesson")).toBeUndefined();
    expect(commandDescription("non-existent-key")).toBeUndefined();
  });
});

describe("curriculum lessons and examples (AC-2)", () => {
  it("every lesson has a short Portuguese explanation of at most 3 sentences", () => {
    for (const lesson of ALL_LESSONS) {
      expect(lesson.title.length, lesson.id).toBeGreaterThan(2);
      expect(lesson.explanation.length, lesson.id).toBeGreaterThan(20);
      expect(lesson.explanation, lesson.id).toMatch(/[ãçõáéíóú]| você | de | o | a /);
      const sentences = lesson.explanation
        .split(/[.!?]+(?:\s|$)/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      expect(sentences.length, `${lesson.id}: ${lesson.explanation}`).toBeLessThanOrEqual(3);
    }
  });

  it("every lesson example reaches its promised end state and has an oracle case", () => {
    const motionCaseNames = new Set(CURRICULUM_MOTION_CASES.map((c) => c[0]));
    const editCaseNames = new Set(CURRICULUM_EDIT_CASES.map((c) => c[0]));

    for (const lesson of ALL_LESSONS) {
      const frames = curriculumExampleFrames(lesson);
      const keys = parseKeys(lesson.example.keys);
      expect(frames.length, lesson.id).toBe(keys.length + 1);
      expect(frames[0]?.key, lesson.id).toBeNull();
      expect(frames[0]?.lines, lesson.id).toEqual(lesson.example.lines);
      expect(frames[0]?.cursor, lesson.id).toEqual(lesson.example.start);

      const last = frames.at(-1);
      expect(last?.mode, lesson.id).toBe("normal");
      if (lesson.example.kind === "motion") {
        expect(last?.cursor, lesson.id).toEqual(lesson.example.target);
        expect(motionCaseNames.has(`learn: ${lesson.id}`), `oracle motion case ${lesson.id}`).toBe(
          true,
        );
      } else {
        expect(last?.lines, lesson.id).toEqual(lesson.example.after);
        expect(editCaseNames.has(`learn: ${lesson.id}`), `oracle edit case ${lesson.id}`).toBe(
          true,
        );
      }
    }
  });
});

describe("curriculum exercises and adaptive fading (AC-3)", () => {
  it("every lesson has 3 exercises whose reference keys reach the target", () => {
    for (const lesson of ALL_LESSONS) {
      expect(lesson.exercises, lesson.id).toHaveLength(3);
      lesson.exercises.forEach((ex, i) => {
        const label = `${lesson.id}#${String(i + 1)}`;
        const keys = parseKeys(ex.reference);
        expect(keys.length, label).toBeGreaterThan(0);
        let state = createState(ex.lines, ex.start);
        if (ex.kind === "motion") {
          for (const key of keys) {
            const res = pressKey(state, key, ex.level);
            expect(res.blocked, `${label} blocked ${key}`).toBeNull();
            state = res.state;
          }
          expect(state.cursor, label).toEqual(ex.target);
          expect(state.pending, label).toEqual([]);
        } else {
          for (const key of keys) state = pressEditKey(state, key);
          expect(state.lines, label).toEqual(ex.after);
          expect(state.mode, label).toBe("normal");
          expect(state.pending, label).toEqual([]);
        }
      });
    }
  });

  it("nextExerciseStep applies adaptive fading", () => {
    // Exercise 1 (step 0): minimum keys skips step 1 -> step 2; extra keys -> step 1.
    expect(nextExerciseStep(0, 3, 3)).toBe(2);
    expect(nextExerciseStep(0, 2, 3)).toBe(2);
    expect(nextExerciseStep(0, 4, 3)).toBe(1);
    // Exercise 2 (step 1): minimum keys skips step 2 -> done; extra keys -> step 2.
    expect(nextExerciseStep(1, 3, 3)).toBe("done");
    expect(nextExerciseStep(1, 5, 3)).toBe(2);
    // Exercise 3 (step 2): always finishes the lesson.
    expect(nextExerciseStep(2, 10, 3)).toBe("done");
    expect(nextExerciseStep(2, 3, 3)).toBe("done");
  });
});

describe("curriculum progress helpers (AC-4)", () => {
  it("unitStatus reports new, in-progress and done", () => {
    const unit = UNITS[1]!; // 3 lessons
    expect(unitStatus(unit, new Set())).toBe("new");
    expect(unitStatus(unit, new Set([unit.lessons[0]!.id]))).toBe("in-progress");
    expect(unitStatus(unit, new Set(unit.lessons.map((l) => l.id)))).toBe("done");
  });

  it("nextUncompletedLesson returns the first uncompleted lesson in order or null when all done", () => {
    expect(nextUncompletedLesson(new Set())?.id).toBe(ALL_LESSONS[0]?.id);
    expect(nextUncompletedLesson(new Set([ALL_LESSONS[0]!.id]))?.id).toBe(ALL_LESSONS[1]?.id);
    expect(nextUncompletedLesson(new Set(ALL_LESSONS.map((l) => l.id)))).toBeNull();
  });
});
