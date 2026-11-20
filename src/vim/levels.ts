export type Level = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const LEVELS: readonly Level[] = [1, 2, 3, 4, 5, 6, 7];

/** What each level adds, for the level picker. */
export const LEVEL_LABELS: Readonly<Record<Level, string>> = {
  1: "",
  2: "",
  3: "",
  4: "",
  5: "",
  6: "",
  7: "",
};

/** One line of the "Comandos deste nível" panel. */
export type CommandHelp = {
  /** The keys as shown, such as "w", "f{c}" or "{n}G". */
  readonly keys: string;
  /** A sentence in Portuguese. */
  readonly text: string;
  /** The level that adds the command. */
  readonly level: Level;
};

/** The commands of a level, including those of the levels before it. */
export function levelHelp(_level: Level): readonly CommandHelp[] {
  throw new Error("todo");
}

/**
 * The level that adds a command, by name: "h", "ge", "gg", "count", "/"...
 * Null when no level has it.
 */
export function commandLevel(_name: string): Level | null {
  throw new Error("todo");
}
