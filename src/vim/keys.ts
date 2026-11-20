/**
 * A key in Vim notation: one character ("w", " ", "<"), or a name in angle
 * brackets: "<Esc>", "<CR>", "<BS>", "<Tab>", "<C-v>".
 */
export type Key = string;

/** The part of a keyboard event the engine reads. */
export type KeyInput = {
  readonly key: string;
  readonly ctrlKey: boolean;
  readonly altKey: boolean;
  readonly metaKey: boolean;
};

const NAMES = new Set(["Esc", "CR", "BS", "Tab"]);

/** "3fx<CR>" to ["3", "f", "x", "<CR>"]. Throws on an unknown `<name>`. */
export function parseKeys(text: string): Key[] {
  const keys: Key[] = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text.charAt(i);
    if (ch !== "<") {
      keys.push(ch);
      continue;
    }
    const end = text.indexOf(">", i);
    const name = end < 0 ? "" : text.slice(i + 1, end);
    if (name === "lt") keys.push("<");
    else if (name === "Space") keys.push(" ");
    else if (NAMES.has(name) || /^C-[a-z]$/.test(name)) keys.push(`<${name}>`);
    else throw new Error(`unknown key <${name}> in "${text}"`);
    i = end;
  }
  return keys;
}

/** The inverse of `parseKeys`. */
export function formatKeys(keys: readonly Key[]): string {
  return keys.map((k) => (k === " " ? "<Space>" : k === "<" ? "<lt>" : k)).join("");
}

const SPECIAL: Readonly<Record<string, Key>> = {
  Escape: "<Esc>",
  Enter: "<CR>",
  Backspace: "<BS>",
  Tab: "<Tab>",
};

/** The Vim key of a keyboard event, or null when it is not a Vim key. */
export function keyFromEvent(event: KeyInput): Key | null {
  if (event.altKey || event.metaKey) return null;
  if (event.ctrlKey) {
    return /^[a-zA-Z]$/.test(event.key) ? `<C-${event.key.toLowerCase()}>` : null;
  }
  const special = SPECIAL[event.key];
  if (special !== undefined) return special;
  return [...event.key].length === 1 ? event.key : null;
}
