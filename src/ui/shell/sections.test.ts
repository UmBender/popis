import { describe, expect, it } from "vitest";
import { MODE_IDS } from "../../modes";
import { folderOf, ITEMS, itemById, itemByShortcut, SECTIONS, type ItemId } from "./sections";

// T18 AC-2: one table holds the tree: folders, items, order and shortcuts.

/** Every screen that is not a mode of MODES. */
const SCREENS: readonly ItemId[] = [
  "daily",
  "data",
  "progress",
  "typing",
  "text",
  "typing-weak",
  "vim-learn",
  "vim-motion",
  "vim-edit",
  "gdb-learn",
  "gdb-commands",
  "gdb-output",
  "compile-read",
];

describe("sections", () => {
  it("sections list the folders and items in the default order", () => {
    expect(SECTIONS.map((f) => [f.label, f.items.map((i) => i.label)])).toEqual([
      ["Hoje", ["Treino do dia"]],
      ["Cálculo", ["Aritmética", "Álgebra", "Fatoração", "Somatórios"]],
      ["CP", ["Divisão inteira", "Estimativa", "Primos"]],
      ["Treino", ["Revisar", "Dados", "Evolução"]],
      ["Digitação", ["Código", "Texto", "Pontos fracos"]],
      ["Vim", ["Aprender", "Movimento", "Edição"]],
      ["GDB", ["Aprender", "Comandos", "Saída"]],
      ["Maratona", ["Ler o erro"]],
    ]);
  });

  it("Maratona folder follows GDB with Ler o erro and keeps shortcuts 1-9", () => {
    const gdbIdx = SECTIONS.findIndex((f) => f.id === "gdb");
    const maratonaIdx = SECTIONS.findIndex((f) => f.id === "maratona");
    expect(maratonaIdx).toBe(gdbIdx + 1);
    const maratona = SECTIONS[maratonaIdx];
    expect(maratona?.label).toBe("Maratona");
    expect(maratona?.items.map((i) => [i.id, i.label, i.touch, i.shortcut])).toEqual([
      ["compile-read", "Ler o erro", true, null],
    ]);
    expect(ITEMS.slice(1, 10).map((i) => i.shortcut)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("GDB folder follows Vim and keeps shortcuts 1-9", () => {
    const vimIdx = SECTIONS.findIndex((f) => f.id === "vim");
    const gdbIdx = SECTIONS.findIndex((f) => f.id === "gdb");
    expect(gdbIdx).toBe(vimIdx + 1);
    const gdb = SECTIONS[gdbIdx];
    expect(gdb?.label).toBe("GDB");
    expect(gdb?.items.map((i) => [i.id, i.label, i.touch, i.shortcut])).toEqual([
      ["gdb-learn", "Aprender", true, null],
      ["gdb-commands", "Comandos", true, null],
      ["gdb-output", "Saída", true, null],
    ]);
    expect(ITEMS.slice(1, 10).map((i) => i.shortcut)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
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

  it("sections place Treino do dia at the top and keep shortcuts 1 to 9 for the modes and tools", () => {
    expect(ITEMS[0]?.id).toBe("daily");
    expect(ITEMS[0]?.shortcut).toBeNull();
    const numbered = ITEMS.slice(1, 10);
    expect(numbered.map((i) => i.shortcut)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(ITEMS.slice(10).every((i) => i.shortcut === null)).toBe(true);
    expect(itemByShortcut(3)?.id).toBe("factoring");
    expect(itemByShortcut(10)).toBeUndefined();
  });

  it("sections keep Aprender visible on touch screens and hide typing, weak points, motion and edit", () => {
    const hidden = ITEMS.filter((i) => !i.touch).map((i) => i.id);
    expect(hidden).toEqual(["typing", "typing-weak", "vim-motion", "vim-edit"]);
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
