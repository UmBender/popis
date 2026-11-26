import { describe, expect, it } from "vitest";
import { gdbLessonById } from "../gdb/curriculum";
import { regexLessonById } from "../regex/curriculum";
import { shellLessonById } from "../shell/curriculum";
import { isItemId } from "../ui/shell/sections";
import { curriculumLessonById } from "../vim/curriculum";
import { GUIDE_ITEMS, GUIDE_SECTIONS, isGuideItemId, type GuideLearnItem } from "./content";

// T44 AC-1: structured contest checklists with verified links to tree items or Aprender lessons.

const LESSON_EXISTS: Readonly<Record<GuideLearnItem, (id: string) => boolean>> = {
  "vim-learn": (id) => curriculumLessonById(id) !== undefined,
  "gdb-learn": (id) => gdbLessonById(id) !== undefined,
  "shell-learn": (id) => shellLessonById(id) !== undefined,
  "regex-learn": (id) => regexLessonById(id) !== undefined,
};

describe("guide content (AC-1)", () => {
  it("every link points to an existing item or lesson", () => {
    let itemLinks = 0;
    let lessonLinks = 0;

    for (const section of GUIDE_SECTIONS) {
      for (const item of section.items) {
        if (item.link === undefined) continue;
        expect(isItemId(item.link.item), item.id).toBe(true);
        expect(item.link.label.trim().length, item.id).toBeGreaterThan(0);
        if (item.link.kind === "item") {
          itemLinks += 1;
        } else {
          lessonLinks += 1;
          expect(LESSON_EXISTS[item.link.item](item.link.lesson), item.id).toBe(true);
        }
      }
    }

    expect(itemLinks).toBeGreaterThan(0);
    expect(lessonLinks).toBeGreaterThan(0);

    const bashrc = GUIDE_ITEMS.find((item) => item.text.includes(".bashrc"));
    expect(bashrc?.link).toEqual({
      kind: "lesson",
      item: "shell-learn",
      lesson: "u8-bashrc",
      label: "Shell: .bashrc",
    });

    const tle = GUIDE_SECTIONS.find((section) => section.id === "tle");
    expect(
      tle?.items.some((item) => item.link?.kind === "item" && item.link.item === "estimation"),
    ).toBe(true);
  });

  it("sections cover all seven contest checklists with unique ids and no raw backticks", () => {
    expect(GUIDE_SECTIONS.map((s) => [s.id, s.title])).toEqual([
      ["setup", "Primeiros 15 minutos"],
      ["submit", "Antes de submeter"],
      ["wa", "WA"],
      ["tle", "TLE"],
      ["rte", "RTE"],
      ["mle", "MLE"],
      ["team", "Time"],
    ]);

    const ids = new Set<string>();
    for (const section of GUIDE_SECTIONS) {
      expect(section.items.length, section.id).toBeGreaterThanOrEqual(3);
      expect(section.title).not.toContain("`");
      for (const item of section.items) {
        expect(item.id.trim().length).toBeGreaterThan(0);
        expect(ids.has(item.id), item.id).toBe(false);
        ids.add(item.id);
        expect(item.text.trim().length, item.id).toBeGreaterThan(0);
        expect(item.text, item.id).not.toContain("`");
        expect(isGuideItemId(item.id), item.id).toBe(true);
      }
    }

    expect(GUIDE_ITEMS).toHaveLength(ids.size);
    expect(isGuideItemId("")).toBe(false);
    expect(isGuideItemId("nonexistent-item")).toBe(false);
    expect(isGuideItemId(42)).toBe(false);
    expect(isGuideItemId(null)).toBe(false);
  });
});
