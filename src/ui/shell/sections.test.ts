import { describe, expect, it } from "vitest";
import { MODE_IDS } from "../../modes";
import { folderOf, ITEMS, itemById, itemByShortcut, SECTIONS, type ItemId } from "./sections";

// T18 AC-2: one table holds the tree: folders, items, order and shortcuts.

/** Every screen that is not a mode of MODES. */
const SCREENS: readonly ItemId[] = [
  "data",
  "progress",
  "typing",
  "text",
  "vim-learn",
  "vim-motion",
  "vim-edit",
];

describe("sections", () => {
  it("sections list the folders and items in the default order", () => {
    expect(SECTIONS.map((f) => [f.label, f.items.map((i) => i.label)])).toEqual([
      ["Cálculo", ["Aritmética", "Álgebra", "Fatoração", "Somatórios"]],
      ["CP", ["Divisão inteira", "Estimativa", "Primos"]],
      ["Treino", ["Revisar", "Dados", "Evolução"]],
      ["Digitação", ["Código", "Texto"]],
      ["Vim", ["Aprender", "Movimento", "Edição"]],
    ]);
  });

  it("sections hold every mode and every screen exactly once", () => {
    const ids = ITEMS.map((i) => i.id);
    for (const id of [...MODE_IDS, ...SCREENS]) {
      expect(
        ids.filter((x) => x === id),
        id,
      ).toHaveLength(1);
    }
    expect(ids).toHaveLength(MODE_IDS.length + SCREENS.length);
  });

  it("sections give the shortcuts 1 to 9 to the first nine items", () => {
    expect(ITEMS.slice(0, 9).map((i) => i.shortcut)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(ITEMS.slice(9).every((i) => i.shortcut === null)).toBe(true);
    expect(itemByShortcut(3)?.id).toBe("factoring");
    expect(itemByShortcut(10)).toBeUndefined();
  });

  it("sections keep Aprender visible on touch screens and hide typing, motion and edit", () => {
    const hidden = ITEMS.filter((i) => !i.touch).map((i) => i.id);
    expect(hidden).toEqual(["typing", "vim-motion", "vim-edit"]);
  });

  it("folderOf finds the folder of an item", () => {
    expect(folderOf("primes").label).toBe("CP");
    expect(folderOf("data").label).toBe("Treino");
  });

  it("itemById and folderOf throw on an unknown item", () => {
    expect(() => itemById("missing" as ItemId)).toThrow();
    expect(() => folderOf("missing" as ItemId)).toThrow();
  });
});
