import { isMode, type Mode } from "../../modes";

/** One entry of the tree: a mode of MODES or another screen (ADR-T18-1). */
export type ItemId =
  | Mode
  | "data"
  | "progress"
  | "typing"
  | "text"
  | "vim-learn"
  | "vim-motion"
  | "vim-edit";

export type TreeItem = {
  readonly id: ItemId;
  /** Accessible name and visible label. */
  readonly label: string;
  /** The digit that jumps to it, for the first nine items. */
  readonly shortcut: number | null;
  /** Shown on touch screens (code typing and Vim need a keyboard). */
  readonly touch: boolean;
};

export type Folder = {
  readonly id: string;
  readonly label: string;
  readonly items: readonly TreeItem[];
};

type Row = readonly [id: ItemId, label: string, touch?: false];

const TABLE: readonly (readonly [id: string, label: string, rows: readonly Row[]])[] = [
  [
    "calculo",
    "Cálculo",
    [
      ["arithmetic", "Aritmética"],
      ["algebra", "Álgebra"],
      ["factoring", "Fatoração"],
      ["sums", "Somatórios"],
    ],
  ],
  [
    "cp",
    "CP",
    [
      ["division", "Divisão inteira"],
      ["estimation", "Estimativa"],
      ["primes", "Primos"],
    ],
  ],
  [
    "treino",
    "Treino",
    [
      ["review", "Revisar"],
      ["data", "Dados"],
      ["progress", "Evolução"],
    ],
  ],
  [
    "digitacao",
    "Digitação",
    [
      ["typing", "Código", false],
      ["text", "Texto"],
    ],
  ],
  [
    "vim",
    "Vim",
    [
      ["vim-learn", "Aprender"],
      ["vim-motion", "Movimento", false],
      ["vim-edit", "Edição", false],
    ],
  ],
];

let position = 0;

/** The tree, in its default order. */
export const SECTIONS: readonly Folder[] = TABLE.map(([id, label, rows]) => ({
  id,
  label,
  items: rows.map(([itemId, itemLabel, touch]) => {
    position += 1;
    return {
      id: itemId,
      label: itemLabel,
      shortcut: position <= 9 ? position : null,
      touch: touch ?? true,
    };
  }),
}));

/** Every item, in tree order. */
export const ITEMS: readonly TreeItem[] = SECTIONS.flatMap((f) => f.items);

export function isItemId(value: unknown): value is ItemId {
  return ITEMS.some((i) => i.id === value);
}

export function itemById(id: ItemId): TreeItem {
  const item = ITEMS.find((i) => i.id === id);
  if (item === undefined) throw new Error(`unknown item ${id}`);
  return item;
}

export function itemByShortcut(digit: number): TreeItem | undefined {
  return ITEMS.find((i) => i.shortcut === digit);
}

export function folderOf(id: ItemId): Folder {
  const folder = SECTIONS.find((f) => f.items.some((i) => i.id === id));
  if (folder === undefined) throw new Error(`unknown item ${id}`);
  return folder;
}

/** The mode of a mode item, or null for the other screens. */
export function modeOf(id: ItemId): Mode | null {
  return isMode(id) ? id : null;
}
