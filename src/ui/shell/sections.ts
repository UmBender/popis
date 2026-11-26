import { isMode, type Mode } from "../../modes";

/** One entry of the tree: a mode of MODES or another screen (ADR-T18-1, ADR-T24-1). */
export type ItemId =
  | Mode
  | "daily"
  | "data"
  | "progress"
  | "typing"
  | "text"
  | "typing-weak"
  | "vim-learn"
  | "vim-motion"
  | "vim-edit"
  | "gdb-learn"
  | "gdb-commands"
  | "gdb-output"
  | "shell-learn"
  | "shell-commands"
  | "regex-learn"
  | "regex-practice"
  | "compile-read"
  | "stl"
  | "icpc"
  | "ref-cpp"
  | "ref-py";

export type TreeItem = {
  readonly id: ItemId;
  /** Accessible name and visible label. */
  readonly label: string;
  /** Disambiguated accessible name when another folder has the same visible label. */
  readonly ariaLabel?: string;
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

type Row = readonly [id: ItemId, label: string, touch?: false, ariaLabel?: string];

const TABLE: readonly (readonly [id: string, label: string, rows: readonly Row[]])[] = [
  ["hoje", "Hoje", [["daily", "Treino do dia"]]],
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
      ["typing-weak", "Pontos fracos", false],
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
  [
    "gdb",
    "GDB",
    [
      ["gdb-learn", "Aprender", undefined, "Aprender (GDB)"],
      ["gdb-commands", "Comandos"],
      ["gdb-output", "Saída"],
    ],
  ],
  [
    "shell",
    "Shell",
    [
      ["shell-learn", "Aprender", undefined, "Aprender (Shell)"],
      ["shell-commands", "Comandos", undefined, "Comandos (Shell)"],
    ],
  ],
  [
    "regex",
    "Regex",
    [
      ["regex-learn", "Aprender", undefined, "Aprender (Regex)"],
      ["regex-practice", "Prática"],
    ],
  ],
  [
    "maratona",
    "Maratona",
    [
      ["compile-read", "Ler o erro"],
      ["stl", "STL"],
      ["icpc", "Placar"],
    ],
  ],
  [
    "referencia",
    "Referência",
    [
      ["ref-cpp", "C++"],
      ["ref-py", "Python"],
    ],
  ],
];

let position = 0;

/** The tree, in its default order. */
export const SECTIONS: readonly Folder[] = TABLE.map(([id, label, rows]) => ({
  id,
  label,
  items: rows.map(([itemId, itemLabel, touch, ariaLabel]) => {
    const shortcut = itemId === "daily" ? null : position < 9 ? (position += 1) : null;
    return {
      id: itemId,
      label: itemLabel,
      ...(ariaLabel !== undefined ? { ariaLabel } : {}),
      shortcut,
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
