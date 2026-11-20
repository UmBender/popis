export type Level = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const LEVELS: readonly Level[] = [1, 2, 3, 4, 5, 6, 7];

/** What each level adds, for the level picker. */
export const LEVEL_LABELS: Readonly<Record<Level, string>> = {
  1: "h j k l",
  2: "w b e W B E ge",
  3: "0 ^ $",
  4: "f F t T ; ,",
  5: "contagens",
  6: "gg G {n}G { } %",
  7: "/ ? n N * #",
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

const HELP: readonly CommandHelp[] = [
  { level: 1, keys: "h", text: "move o cursor um caractere para a esquerda" },
  { level: 1, keys: "j", text: "desce o cursor uma linha" },
  { level: 1, keys: "k", text: "sobe o cursor uma linha" },
  { level: 1, keys: "l", text: "move o cursor um caractere para a direita" },
  { level: 2, keys: "w", text: "vai ao início da próxima palavra" },
  { level: 2, keys: "b", text: "volta ao início da palavra (ou da anterior)" },
  { level: 2, keys: "e", text: "vai ao fim da palavra (ou da próxima)" },
  { level: 2, keys: "W", text: "como w, mas uma palavra é tudo até o próximo espaço" },
  { level: 2, keys: "B", text: "como b, mas uma palavra é tudo até o espaço anterior" },
  { level: 2, keys: "E", text: "como e, mas uma palavra é tudo até o próximo espaço" },
  { level: 2, keys: "ge", text: "volta ao fim da palavra anterior" },
  { level: 3, keys: "0", text: "vai ao início da linha" },
  { level: 3, keys: "^", text: "vai ao primeiro caractere que não é espaço" },
  { level: 3, keys: "$", text: "vai ao fim da linha" },
  { level: 4, keys: "f{c}", text: "vai até o próximo caractere {c} da linha" },
  { level: 4, keys: "F{c}", text: "vai até o caractere {c} anterior da linha" },
  {
    level: 4,
    keys: "t{c}",
    text: "vai até antes do próximo caractere {c} (t, para antes da vírgula)",
  },
  { level: 4, keys: "T{c}", text: "vai até depois do caractere {c} anterior" },
  { level: 4, keys: ";", text: "repete o último f, F, t ou T" },
  { level: 4, keys: ",", text: "repete o último f, F, t ou T ao contrário" },
  {
    level: 5,
    keys: "{n}",
    text: "um número antes de um movimento o repete: 3w anda três palavras",
  },
  { level: 6, keys: "gg", text: "vai à primeira linha" },
  { level: 6, keys: "G", text: "vai à última linha" },
  { level: 6, keys: "{n}G", text: "vai à linha de número n" },
  { level: 6, keys: "{", text: "volta até a linha vazia anterior (parágrafo)" },
  { level: 6, keys: "}", text: "avança até a próxima linha vazia (parágrafo)" },
  { level: 6, keys: "%", text: "vai ao parêntese, colchete ou chave que fecha ou abre o par" },
  { level: 7, keys: "/", text: "busca o texto digitado para frente, até o Enter" },
  { level: 7, keys: "?", text: "busca o texto digitado para trás, até o Enter" },
  { level: 7, keys: "n", text: "vai à próxima ocorrência da última busca" },
  { level: 7, keys: "N", text: "vai à ocorrência anterior da última busca" },
  { level: 7, keys: "*", text: "busca para frente a palavra sob o cursor" },
  { level: 7, keys: "#", text: "busca para trás a palavra sob o cursor" },
];

/** The commands of a level, including those of the levels before it. */
export function levelHelp(level: Level): readonly CommandHelp[] {
  return HELP.filter((h) => h.level <= level);
}

const COMMAND_LEVELS: Readonly<Record<string, Level>> = {
  ...Object.fromEntries([..."hjkl"].map((k) => [k, 1])),
  ...Object.fromEntries(["w", "b", "e", "W", "B", "E", "ge", "g"].map((k) => [k, 2])),
  ...Object.fromEntries([..."0^$"].map((k) => [k, 3])),
  ...Object.fromEntries([..."fFtT;,"].map((k) => [k, 4])),
  count: 5,
  ...Object.fromEntries(["gg", "G", "{", "}", "%"].map((k) => [k, 6])),
  ...Object.fromEntries([..."/?nN*#"].map((k) => [k, 7])),
};

/**
 * The level that adds a command, by name: "h", "ge", "gg", "count", "/"...
 * Null when no level has it.
 */
export function commandLevel(name: string): Level | null {
  return Object.hasOwn(COMMAND_LEVELS, name) ? (COMMAND_LEVELS[name] as Level) : null;
}
