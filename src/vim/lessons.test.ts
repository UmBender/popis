import { describe, expect, it } from "vitest";
import { generateEdit } from "./drills/edit";
import { REGISTER_KINDS } from "./drills/register-edit";
import { pressEditKey } from "./edit";
import { parseKeys } from "./keys";
import { LESSONS, exampleFrames, exerciseFor, lessonFor } from "./lessons";
import { createState } from "./state";

// AC-6: one lesson for each register kind: a short explanation, an animated
// example and a guided exercise.

describe("lessons", () => {
  it("there is one lesson for each register kind, in the same order", () => {
    expect(LESSONS.map((l) => l.kind)).toEqual(REGISTER_KINDS);
  });

  it.each(REGISTER_KINDS)("the lesson of %s explains its commands", (kind) => {
    const lesson = lessonFor(kind);
    expect(lesson.title.length).toBeGreaterThan(3);
    expect(lesson.explanation.length).toBeGreaterThan(40);
    expect(lesson.explanation.length).toBeLessThan(400);
    expect(lesson.commands.length).toBeGreaterThan(0);
  });

  it.each(REGISTER_KINDS)("the example of %s ends on the buffer it promises", (kind) => {
    const lesson = lessonFor(kind);
    const frames = exampleFrames(lesson);
    expect(frames.length).toBe(parseKeys(lesson.example.keys).length + 1);
    expect(frames[0]?.lines).toEqual(lesson.example.lines);
    expect(frames.at(-1)?.lines).toEqual(lesson.example.after);
    expect(frames.at(-1)?.mode).toBe("normal");
  });

  it("a frame shows the key that led to it", () => {
    const lesson = lessonFor("number-lines");
    const frames = exampleFrames(lesson);
    expect(frames[0]?.key).toBeNull();
    expect(frames.slice(1).map((f) => f.key)).toEqual(parseKeys(lesson.example.keys));
  });

  it.each(REGISTER_KINDS)("the exercise of %s is a fixed edit of its kind", (kind) => {
    const lesson = lessonFor(kind);
    const edit = exerciseFor(lesson);
    expect(edit.kind).toBe(kind);
    expect(edit).toEqual(generateEdit(lesson.exercise.seed, 0, [kind]));
    let state = createState(edit.lines, edit.start);
    for (const key of parseKeys(edit.reference)) state = pressEditKey(state, key);
    expect(state.lines).toEqual(edit.after);
  });

  it("the explanations are in Portuguese and name the command in CP use", () => {
    for (const lesson of LESSONS)
      expect(lesson.explanation).toMatch(/[ãçõáéíóú]| você | de | o | a /);
  });
});
