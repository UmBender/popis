import { firstNonBlank, snapshot, withCursor, withUndo } from "./buffer";
import type { Key } from "./keys";
import type { VimState } from "./state";

// The command line (ADR-T15-1): `:s` with a range, and `:noh`, `:w`, `:q`
// accepted without effect.

/** `:` pressed: the line starts with `text` (the range of a selection). */
export function startCmdline(state: VimState, text = ""): VimState {
  return { ...state, mode: "cmdline", cmdline: text, pending: [] };
}

const closed = (state: VimState): VimState => ({ ...state, mode: "normal", cmdline: null });

/** One key typed on the command line. */
export function pressCmdline(state: VimState, key: Key): VimState {
  // The command line mode always has its text.
  const text = state.cmdline as string;
  if (key === "<Esc>") return closed(state);
  if (key === "<BS>") {
    return text === "" ? closed(state) : { ...state, cmdline: text.slice(0, -1) };
  }
  if (key === "<CR>") return runEx(closed(state), text);
  return key.length === 1 ? { ...state, cmdline: text + key } : state;
}

type Address = { readonly value: number | null; readonly rest: string };

/** One address: a base and offsets; no value when none is there, undefined on an error. */
function parseAddress(state: VimState, text: string): Address | undefined {
  const current = state.cursor.line + 1;
  const last = state.lines.length;
  let rest = text;
  let base: number | null = null;
  const mark = state.lastVisual;
  const markLines = mark === null ? null : [mark.anchor.line + 1, mark.cursor.line + 1];
  let match: RegExpExecArray | null;
  if ((match = /^\d+/.exec(rest))) {
    base = Number(match[0]);
    rest = rest.slice(match[0].length);
  } else if (rest.startsWith(".")) {
    base = current;
    rest = rest.slice(1);
  } else if (rest.startsWith("$")) {
    base = last;
    rest = rest.slice(1);
  } else if (rest.startsWith("'<") || rest.startsWith("'>")) {
    if (markLines === null) return undefined;
    base = rest.charAt(1) === "<" ? Math.min(...markLines) : Math.max(...markLines);
    rest = rest.slice(2);
  }
  let offset = 0;
  let any = base !== null;
  while ((match = /^([+-])(\d*)/.exec(rest))) {
    const n = match[2] === "" ? 1 : Number(match[2]);
    offset += match[1] === "+" ? n : -n;
    rest = rest.slice(match[0].length);
    any = true;
  }
  if (!any) return { value: null, rest };
  return { value: (base ?? current) + offset, rest };
}

/** The line range (0-based, in order) and what follows it; undefined on an error. */
function parseRange(
  state: VimState,
  text: string,
): { from: number; to: number; rest: string } | undefined {
  const last = state.lines.length;
  const line = state.cursor.line;
  if (text.startsWith("%")) return { from: 0, to: last - 1, rest: text.slice(1) };
  const first = parseAddress(state, text);
  if (first === undefined) return undefined;
  if (first.value === null) return { from: line, to: line, rest: first.rest };
  let to = first.value;
  let rest = first.rest;
  if (rest.startsWith(",")) {
    const second = parseAddress(state, rest.slice(1));
    if (second === undefined) return undefined;
    to = second.value ?? line + 1;
    rest = second.rest;
  }
  // A backwards range asks a question in Vim; here it is an error, like E16.
  if (first.value < 1 || to > last || first.value > to) return undefined;
  return { from: first.value - 1, to: to - 1, rest };
}

const escape = (ch: string): string => ch.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");

/** The subset of Vim patterns of ADR-T15-1 as a RegExp. */
function toRegExp(pattern: string): RegExp {
  let source = "";
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern.charAt(i);
    if (ch === "\\" && i + 1 < pattern.length) {
      const next = pattern.charAt(++i);
      if (next === "<") source += "\\b(?=\\w)";
      else if (next === ">") source += "\\b(?<=\\w)";
      else source += escape(next);
    } else if (ch === "^" && i === 0) source += "^";
    else if (ch === "$" && i === pattern.length - 1) source += "$";
    else if (ch === "." || (ch === "*" && source !== "")) source += ch;
    else source += escape(ch);
  }
  return new RegExp(source, "g");
}

/** A replacement as a function of the match: `&`, `\&`, `\\` and `\/`. */
function replacement(text: string): (match: string) => string {
  return (match) => {
    let out = "";
    for (let i = 0; i < text.length; i++) {
      const ch = text.charAt(i);
      if (ch === "\\" && i + 1 < text.length) out += text.charAt(++i);
      else out += ch === "&" ? match : ch;
    }
    return out;
  };
}

/** The pieces of `s/pat/rep/flags`; the text after the `s`. */
function splitSubstitute(text: string): { pattern: string; rep: string; flags: string } | null {
  const delimiter = text.charAt(0);
  if (delimiter === "" || /[\w\s\\"|]/.test(delimiter)) return null;
  const parts: string[] = [""];
  for (let i = 1; i < text.length; i++) {
    const ch = text.charAt(i);
    const part = parts.length - 1;
    if (ch === "\\" && i + 1 < text.length) {
      const next = text.charAt(++i);
      // An escaped delimiter is the character itself; other escapes stay for later.
      parts[part] += next === delimiter && parts.length === 1 ? next : `\\${next}`;
    } else if (ch === delimiter && parts.length < 3) {
      parts.push("");
    } else {
      parts[part] += ch;
    }
  }
  return { pattern: parts[0] as string, rep: parts[1] ?? "", flags: parts[2] ?? "" };
}

function substituteLine(
  text: string,
  re: RegExp,
  replace: (match: string) => string,
  global: boolean,
): string | null {
  let out = "";
  let pos = 0;
  let changed = false;
  while (!changed || (global && pos < text.length)) {
    re.lastIndex = pos;
    const hit = re.exec(text);
    if (hit === null) break;
    out += text.slice(pos, hit.index) + replace(hit[0]);
    changed = true;
    if (hit[0] === "") {
      if (hit.index >= text.length) {
        pos = text.length;
        break;
      }
      out += text.charAt(hit.index);
      pos = hit.index + 1;
    } else {
      pos = hit.index + hit[0].length;
    }
  }
  return changed ? out + text.slice(pos) : null;
}

function substitute(state: VimState, from: number, to: number, text: string): VimState {
  const parts = splitSubstitute(text);
  if (parts === null || parts.pattern === "" || !/^g?$/.test(parts.flags)) return state;
  const re = toRegExp(parts.pattern);
  const replace = replacement(parts.rep);
  let lastChanged = -1;
  const lines = state.lines.map((line, i) => {
    if (i < from || i > to) return line;
    const next = substituteLine(line, re, replace, parts.flags === "g");
    if (next === null) return line;
    lastChanged = i;
    return next;
  });
  if (lastChanged < 0) return state;
  const moved = withCursor(
    { ...state, lines },
    lastChanged,
    firstNonBlank(lines[lastChanged] as string),
  );
  return withUndo(state, snapshot(state), moved);
}

/** Runs a command line; one that does not parse changes nothing. */
export function runEx(state: VimState, text: string): VimState {
  const range = parseRange(state, text.trimStart());
  if (range === undefined) return state;
  const command = range.rest.trim();
  if (command.startsWith("s")) {
    return substitute(state, range.from, range.to, command.slice(1));
  }
  // :noh, :w and :q are accepted so the habit does not get in the way.
  return state;
}
