import { describe, expect, it } from "vitest";
import { nextUncompleted, unitStatus } from "../learn/curriculum";
import { checkCasar, checkExtrair, checkLer, checkTrocar } from "./check";
import { compile } from "./compile";
import { REGEX_LESSONS, REGEX_UNITS, regexLessonById, regexLessonForToken } from "./curriculum";
import type { RegexItem } from "./types";

// T45 AC-6: 9-unit ordered regex curriculum, <= 3-sentence explanations,
// valid animated example steps, and 3 exercises per lesson whose canonicals pass.

function checkCanonical(item: RegexItem): boolean {
  if (item.kind === "casar") {
    const res = checkCasar(item.canonical, item);
    return res.ok && res.allPassed;
  }
  if (item.kind === "extrair") {
    const res = checkExtrair(item.canonical, item);
    return res.ok && res.allPassed;
  }
  if (item.kind === "trocar") {
    const res = checkTrocar(item.canonical, item.canonicalReplacement, item);
    return res.ok && res.allPassed;
  }
  const compiled = compile(item.pattern, item.dialect, item.mode);
  if (!compiled.ok) return false;
  const matches = item.lines.map((l) => compiled.matcher.test(l));
  return (
    matches.every((m, i) => m === item.expected[i]) && checkLer(item.expected, item).allPassed
  );
}

describe("regex curriculum (AC-6)", () => {
  it("defines 9 ordered units with unique lesson IDs and concise explanations", () => {
    expect(REGEX_UNITS).toHaveLength(9);
    expect(REGEX_UNITS.map((u) => u.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const ids = REGEX_LESSONS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const lesson of REGEX_LESSONS) {
      expect(regexLessonById(lesson.id)).toBe(lesson);
      expect(lesson.explanation.length).toBeGreaterThan(20);
      // Up to 3 sentences in the explanation.
      const sentences = lesson.explanation
        .split(/[.!?]+(?:\s+|$)/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      expect(sentences.length, lesson.id).toBeLessThanOrEqual(3);
      expect(lesson.tokens.length, lesson.id).toBeGreaterThan(0);
    }
  });

  it("every lesson has 3 exercises", () => {
    for (const lesson of REGEX_LESSONS) {
      expect(lesson.exercises, lesson.id).toHaveLength(3);
    }
  });

  it("every exercise canonical answer passes", () => {
    for (const lesson of REGEX_LESSONS) {
      for (const ex of lesson.exercises) {
        expect(checkCanonical(ex), `${lesson.id}/${ex.id}`).toBe(true);
      }
    }
  });

  it("every lesson animated example compiles cleanly at every step", () => {
    for (const lesson of REGEX_LESSONS) {
      expect(lesson.example.lines.length, lesson.id).toBeGreaterThanOrEqual(2);
      expect(lesson.example.steps.length, lesson.id).toBeGreaterThanOrEqual(2);
      for (const step of lesson.example.steps) {
        const compiled = compile(step.pattern, lesson.example.dialect, lesson.example.mode);
        expect(compiled.ok, `${lesson.id}: ${step.pattern}`).toBe(true);
      }
    }
  });

  it("integrates with shared curriculum helpers and token lookup", () => {
    const u1 = REGEX_UNITS[0]!;
    expect(unitStatus(u1, new Set())).toBe("new");
    expect(nextUncompleted(REGEX_LESSONS, new Set())?.id).toBe(REGEX_LESSONS[0]?.id);
    expect(regexLessonForToken("\\d")?.id).toBe("u2-shorthands");
  });
});
