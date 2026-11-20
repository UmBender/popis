import type { Key } from "./keys";
import type { Register, VimState } from "./state";

/** One register as `getreg()` and `getregtype()` report it. */
export type RegisterSummary = {
  readonly reg: string;
  readonly regtype: "v" | "V" | `\x16${number}`;
};

/** One line of the register list, as `:reg` shows it. */
export type RegisterLine = {
  readonly name: string;
  readonly type: "c" | "l" | "b";
  /** Line breaks as `^J` and control characters as `^X`. */
  readonly text: string;
};

/** The registers a command can name: `"`, `0`-`9`, `-`, letters and the black hole. */
export const isRegisterName = (name: string): boolean => /^[a-zA-Z0-9"_-]$/.test(name);

/** The order `:reg` lists the registers in, and the order the oracle reports them. */
const ORDER = [..."0123456789-abcdefghijklmnopqrstuvwxyz"];

/** The text `getreg()` gives: "a\nb" for characters, "a\n" for lines. */
export function registerText(register: Register): string {
  return register.lines.join("\n") + (register.linewise ? "\n" : "");
}

/** The register `name`, or null when it is empty, the black hole or not a register. */
export function getRegister(state: VimState, name: string): Register | null {
  if (name === '"') return state.register;
  return state.registers[name.toLowerCase()] ?? null;
}

const regtype = (register: Register): RegisterSummary["regtype"] =>
  register.block !== undefined
    ? (`\x16${String(register.block)}` as `\x16${number}`)
    : register.linewise
      ? "V"
      : "v";

/** Every register that is not empty among `0`-`9`, `-` and `a`-`z`, for the oracle. */
export function registersView(state: VimState): Record<string, RegisterSummary> {
  const view: Record<string, RegisterSummary> = {};
  for (const name of ORDER) {
    const register = state.registers[name];
    if (register !== undefined)
      view[name] = { reg: registerText(register), regtype: regtype(register) };
  }
  return view;
}

/** A control character as `:reg` shows it: `^[` for Esc, `^J` for a line break. */
function show(text: string): string {
  return [...text.replaceAll("\u0080kb", "^H")]
    .map((ch) => {
      const code = ch.charCodeAt(0);
      if (code === 127) return "^?";
      return code < 32 ? `^${String.fromCharCode(code + 64)}` : ch;
    })
    .join("");
}

/** The non-empty registers in the order of `:reg`: `"`, `0`-`9`, `-`, `a`-`z`. */
export function listRegisters(state: VimState): readonly RegisterLine[] {
  const names = ['"', ...ORDER];
  return names.flatMap((name) => {
    const register = getRegister(state, name);
    if (register === null) return [];
    const type = register.block !== undefined ? "b" : register.linewise ? "l" : "c";
    return [{ name, type, text: show(registerText(register)) } as const];
  });
}

const CONTROL_KEYS: Readonly<Record<string, string>> = {
  "<Esc>": "\x1b",
  "<CR>": "\r",
  "<BS>": "\u0080kb",
  "<Tab>": "\t",
};

/** The text a recording leaves in a register: `<Esc>` is 0x1b, `<CR>` is `\r`. */
export function macroText(keys: readonly Key[]): string {
  return keys
    .map((key) => {
      const named = CONTROL_KEYS[key];
      if (named !== undefined) return named;
      const ctrl = /^<C-([a-z])>$/.exec(key);
      return ctrl === null ? key : String.fromCharCode((ctrl[1] as string).charCodeAt(0) - 96);
    })
    .join("");
}

const BY_CHAR = new Map(Object.entries(CONTROL_KEYS).map(([key, ch]) => [ch, key]));

/** The inverse of `macroText`. A line break (0x0a) stays as it is: the macro runner maps it. */
export function macroKeys(text: string): Key[] {
  const keys: Key[] = [];
  const chars = [...text];
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i] as string;
    if (ch === "\u0080" && chars[i + 1] === "k" && chars[i + 2] === "b") {
      keys.push("<BS>");
      i += 2;
      continue;
    }
    const code = ch.charCodeAt(0);
    const named = BY_CHAR.get(ch);
    if (named !== undefined) keys.push(named);
    else if (code >= 1 && code <= 26 && ch !== "\n") {
      keys.push(`<C-${String.fromCharCode(code + 96)}>`);
    } else keys.push(ch);
  }
  return keys;
}

// ------------------------------------------------------------------ writing

/** How a command wrote to the unnamed register: a copy or a delete. */
export type WriteKind = "yank" | "delete";

/** Appends `added` to `old` the way `"A` does: lines win over characters. */
function append(old: Register, added: Register): Register {
  if (old.linewise || added.linewise) {
    return { lines: [...old.lines, ...added.lines], linewise: true };
  }
  const last = old.lines.at(-1) as string;
  return {
    lines: [...old.lines.slice(0, -1), last + (added.lines[0] as string), ...added.lines.slice(1)],
    linewise: false,
  };
}

/** Moves registers 1-8 to 2-9; the old 9 is dropped. */
function shiftNumbered(registers: Record<string, Register>): void {
  for (let i = 9; i >= 2; i--) {
    const previous = registers[String(i - 1)];
    if (previous === undefined) delete registers[String(i)];
    else registers[String(i)] = previous;
  }
}

/**
 * Spreads what a command put in the unnamed register over the others, the way
 * Vim does (ADR-T16-1): a copy goes to `0`; a delete shifts `1`-`9` when it
 * spans lines (or `forceOne`), and goes to `-` inside a line; a named register
 * takes the text instead of `0` and `-`; `"_` writes nothing. `prev` is the
 * state before the command: when `next` still has the same unnamed register,
 * nothing was written.
 */
export function storeRegister(
  prev: VimState,
  next: VimState,
  kind: WriteKind,
  name: string | null,
  forceOne: boolean,
): VimState {
  const written = next.register;
  if (written === null || written === prev.register) return next;
  if (name === "_") return { ...next, register: prev.register };

  const registers: Record<string, Register> = { ...next.registers };
  const target = name === null || name === '"' ? null : name;
  let unnamed = written;
  if (target !== null) {
    const lower = target.toLowerCase();
    const old = registers[lower];
    unnamed = target === lower || old === undefined ? written : append(old, written);
    registers[lower] = unnamed;
  } else if (kind === "yank") {
    registers["0"] = written;
  }
  if (kind === "delete") {
    const spans = written.linewise || written.lines.length > 1;
    if (spans || forceOne) {
      shiftNumbered(registers);
      registers["1"] = written;
    }
    if (target === null && !written.linewise && written.lines.length === 1) {
      registers["-"] = written;
    }
  }
  return { ...next, register: unnamed, registers };
}

/** The register `qa` or `qA` writes when the recording ends. */
export function recordMacro(state: VimState, name: string, keys: readonly Key[]): VimState {
  const lower = name.toLowerCase();
  const text = macroText(keys);
  const old = state.registers[lower];
  const registers: Record<string, Register> = { ...state.registers };
  if (name !== lower) {
    if (text !== "") {
      const added: Register = { lines: text.split("\n"), linewise: false };
      registers[lower] = old === undefined ? added : append(old, added);
    }
  } else if (text === "") {
    delete registers[lower];
  } else {
    registers[lower] = { lines: text.split("\n"), linewise: false };
  }
  return { ...state, registers, recording: null };
}
